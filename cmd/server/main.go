package main

import (
	"context"
	"log"
	"os"
	"time"

	"route-go/internal/api"
	"route-go/internal/db"
	"route-go/internal/pubsub"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://user:password@localhost:5433/routedb"
	}

	// Retry connection loop for docker
	var repo *db.Repository
	var err error
	for i := 0; i < 10; i++ {
		repo, err = db.NewRepository(databaseURL)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to DB, retrying... %v", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Could not connect to database after retries: %v", err)
	}

	// Init schema
	// in a real app, use migrate tool. for this demo, just read the file
	if err := repo.InitSchema("internal/db/schema.sql"); err != nil {
		log.Printf("Warning: schema init failed (might already exist): %v", err)
	}

	// Init PubSub
	ctx := context.Background()
	// Default project ID for emulator
	if os.Getenv("PUBSUB_EMULATOR_HOST") == "" {
		os.Setenv("PUBSUB_EMULATOR_HOST", "localhost:8085")
	}
	psClient, err := pubsub.NewClient(ctx, "route-go-project")
	if err != nil {
		log.Printf("Warning: failed to init pubsub client: %v", err)
	} else {
		defer psClient.Close()
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	handler := &api.Router{Repo: repo, PubSub: psClient}
	handler.RegisterRoutes(r)

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
