package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"route-go/internal/db"

	"route-go/internal/pubsub"

	"github.com/gin-gonic/gin"
)

type Router struct {
	Repo   *db.Repository
	PubSub *pubsub.Client
}

func (r *Router) RegisterRoutes(g *gin.Engine) {
	api := g.Group("/api")
	{
		api.POST("/vehicles", r.CreateVehicle)
		api.GET("/vehicles", r.ListVehicles)
		api.GET("/vehicles/:id", r.GetVehicle)
		api.PUT("/vehicles/:id", r.UpdateVehicle)
		api.POST("/customers", r.CreateCustomer)
		api.GET("/customers", r.ListCustomers)
		api.POST("/orders", r.CreateOrder)
		api.POST("/orders/batch", r.CreateOrderBatch)
		api.GET("/orders", r.ListOrders)
		api.GET("/routes", r.ListRoutes)
		api.POST("/routes", r.CreateRoute)
		api.GET("/routes/:id", r.GetRoute)
		api.PUT("/routes/:id", r.UpdateRoute)
		api.POST("/routes/:id/reprocess", r.ReprocessRoute)
		api.POST("/routes/optimize", r.TriggerOptimization)
	}
}

func (r *Router) CreateVehicle(c *gin.Context) {
	var v db.Vehicle
	if err := c.ShouldBindJSON(&v); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := r.Repo.CreateVehicle(c.Request.Context(), &v); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (r *Router) ListVehicles(c *gin.Context) {
	vehicles, err := r.Repo.ListVehicles(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, vehicles)
}

func (r *Router) GetVehicle(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	if _, err := fmt.Sscan(idStr, &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	v, err := r.Repo.GetVehicle(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (r *Router) UpdateVehicle(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	if _, err := fmt.Sscan(idStr, &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var v db.Vehicle
	if err := c.ShouldBindJSON(&v); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v.ID = id

	if err := r.Repo.UpdateVehicle(c.Request.Context(), &v); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (r *Router) CreateCustomer(c *gin.Context) {
	var cust db.Customer
	if err := c.ShouldBindJSON(&cust); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := r.Repo.CreateCustomer(c.Request.Context(), &cust); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (r *Router) ListCustomers(c *gin.Context) {
	customers, err := r.Repo.ListCustomers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, customers)
}

func (r *Router) CreateOrder(c *gin.Context) {
	var o db.Order
	if err := c.ShouldBindJSON(&o); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := r.Repo.CreateOrder(c.Request.Context(), &o); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (r *Router) CreateOrderBatch(c *gin.Context) {
	var orders []db.Order
	if err := c.ShouldBindJSON(&orders); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(orders) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty batch"})
		return
	}

	// Ideally execute in transaction, for now just loop
	// repo.CreateOrdersBatch would be better
	if err := r.Repo.CreateOrdersBatch(c.Request.Context(), orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (r *Router) ListOrders(c *gin.Context) {
	status := c.Query("status")
	routeIDStr := c.Query("route_id")
	var routeID int
	if routeIDStr != "" {
		fmt.Sscan(routeIDStr, &routeID)
	}
	orders, err := r.Repo.ListOrders(c.Request.Context(), status, routeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func (r *Router) ListRoutes(c *gin.Context) {
	routes, err := r.Repo.ListRoutes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, routes)
}

func (r *Router) CreateRoute(c *gin.Context) {
	var rt db.Route
	if err := c.ShouldBindJSON(&rt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Default status if empty
	if rt.Status == "" {
		rt.Status = "draft"
	}
	if err := r.Repo.CreateRoute(c.Request.Context(), &rt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rt)
}

func (r *Router) GetRoute(c *gin.Context) {
	idStr := c.Param("id")
	// minimalist string to int, or use strconv
	var id int
	if _, err := fmt.Sscan(idStr, &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	rt, err := r.Repo.GetRoute(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rt)
}

// Structure to parse solution JSON for ID extraction
type SolutionWrapper struct {
	Vehicles []struct {
		Route []struct {
			OrderID int `json:"order_id"`
		} `json:"route"`
	} `json:"vehicles"`
}

func (r *Router) UpdateRoute(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	if _, err := fmt.Sscan(idStr, &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Fetch existing route to support partial updates
	rt, err := r.Repo.GetRoute(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(rt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rt.ID = id

	if err := r.Repo.UpdateRoute(c.Request.Context(), rt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Sync Order Statuses
	// We need to convert rt.SolutionJSON (any) to our struct to extract IDs
	// This is a bit inefficient but robust
	importJson, _ := json.Marshal(rt.SolutionJSON)
	var sol SolutionWrapper
	if err := json.Unmarshal(importJson, &sol); err == nil {
		var orderIDs []int
		for _, v := range sol.Vehicles {
			for _, step := range v.Route {
				if step.OrderID != 0 {
					orderIDs = append(orderIDs, step.OrderID)
				}
			}
		}
		// If status is confirmed, we might want to do something else, but for now just sync orders
		if err := r.Repo.RecruitOrdersToRoute(c.Request.Context(), rt.ID, orderIDs); err != nil {
			// Log error but don't fail request? Or warn?
			fmt.Printf("Error syncing orders: %v\n", err)
		}
	}

	// Publish event if confirmed
	if rt.Status == "confirmed" {
		event := map[string]interface{}{
			"route_id": rt.ID,
			"status":   "confirmed",
		}
		if r.PubSub != nil {
			// Fire and forget or log error
			if err := r.PubSub.Publish(c.Request.Context(), "route-events", event); err != nil {
				fmt.Printf("Failed to publish route.finalized: %v\n", err)
			}
		}
	}

	c.JSON(http.StatusOK, rt)
}

func (r *Router) ReprocessRoute(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	if _, err := fmt.Sscan(idStr, &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Publish event
	event := map[string]interface{}{
		"route_id": id,
		"action":   "reprocess",
	}

	if r.PubSub != nil {
		if err := r.PubSub.Publish(c.Request.Context(), "route-events", event); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish event: " + err.Error()})
			return
		}
	} else {
		// Just for dev convenience if pubsub not configured
		fmt.Println("Warning: PubSub client not initialized")
	}

	c.JSON(http.StatusOK, gin.H{"message": "reprocess requested"})
}

func (r *Router) TriggerOptimization(c *gin.Context) {
	// Publish event to trigger optimization for pending orders
	event := map[string]interface{}{
		"action": "reprocess",
		// No route_id needed means "find all pending and optimize"
	}

	if r.PubSub != nil {
		if err := r.PubSub.Publish(c.Request.Context(), "route-events", event); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish event: " + err.Error()})
			return
		}
	} else {
		// Just for dev convenience if pubsub not configured
		fmt.Println("Warning: PubSub client not initialized")
	}

	c.JSON(http.StatusOK, gin.H{"message": "optimization requested"})
}
