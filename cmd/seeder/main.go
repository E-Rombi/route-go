package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

type Order struct {
	CustomerID      int      `json:"customer_id"`
	CustomerName    string   `json:"customer_name"`
	Lat             float64  `json:"lat"`
	Lon             float64  `json:"lon"`
	Demand          int      `json:"demand"`
	TimeWindows     [][2]int `json:"time_windows"`
	ServiceDuration int      `json:"service_duration"`
}

type City struct {
	Name string
	Lat  float64
	Lon  float64
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Config
	apiURL := "http://localhost:8080/api/orders/batch"
	numOrders := 50 // Increased to ensure distribution across cities

	// Cities Configuration
	cities := []City{
		{Name: "Santa Bárbara d'Oeste", Lat: -22.755, Lon: -47.415},
		{Name: "Americana", Lat: -22.739, Lon: -47.331},
		{Name: "Piracicaba", Lat: -22.725, Lon: -47.649},
		{Name: "Sumaré", Lat: -22.822, Lon: -47.267},
		{Name: "Nova Odessa", Lat: -22.780, Lon: -47.296},
	}

	var orders []Order

	for i := 1; i <= numOrders; i++ {
		// Select a random city
		city := cities[rand.Intn(len(cities))]

		// Random spread approx 3-5km around city center
		// 0.01 degrees is roughly 1.1km
		lat := city.Lat + (rand.Float64()-0.5)*0.06
		lon := city.Lon + (rand.Float64()-0.5)*0.06

		demand := rand.Intn(5) + 1 // 1 to 5 items

		// Determine if it's a Restaurant Order (50% chance)
		isRestaurant := rand.Float64() < 0.5

		var timeWindows [][2]int
		var namePrefix string

		if isRestaurant {
			namePrefix = "Restaurante"
			// 8h-11h (480-660) and 14h-17h (840-1020)
			timeWindows = [][2]int{
				{480, 660},
				{840, 1020},
			}
		} else {
			namePrefix = "Loja"
			// 8h-18h (480-1080) for standard stores
			timeWindows = [][2]int{{480, 1080}}
		}

		orders = append(orders, Order{
			CustomerID:      1000 + i,
			CustomerName:    fmt.Sprintf("%s - %s %d", namePrefix, city.Name, i),
			Lat:             lat,
			Lon:             lon,
			Demand:          demand,
			TimeWindows:     timeWindows,
			ServiceDuration: 10,
		})
	}

	jsonData, err := json.MarshalIndent(orders, "", "  ")
	if err != nil {
		panic(err)
	}

	// fmt.Println(string(jsonData)) // Debug: print generated JSON

	fmt.Printf("Sending %d orders to %s...\n", numOrders, apiURL)
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK {
		fmt.Println("Orders created successfully!")
	} else {
		fmt.Printf("Failed to create orders. Status: %s\n", resp.Status)
	}
}
