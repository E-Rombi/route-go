package pubsub

import (
	"context"
	"encoding/json"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"cloud.google.com/go/pubsub/v2"
	"cloud.google.com/go/pubsub/v2/apiv1/pubsubpb"
)

type Client struct {
	client *pubsub.Client
}

func NewClient(ctx context.Context, projectID string) (*Client, error) {
	// If running with emulator, the library automatically detects PUBSUB_EMULATOR_HOST
	client, err := pubsub.NewClient(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to create pubsub client: %v", err)
	}
	return &Client{client: client}, nil
}

func (c *Client) Publish(ctx context.Context, topicID string, data interface{}) error {
	// Construct full topic name
	topicName := fmt.Sprintf("projects/%s/topics/%s", c.client.Project(), topicID)

	// Admin client to check/create topic
	admin := c.client.TopicAdminClient

	// Ensure topic exists (for convenience in dev/demo)
	// In prod, topics are usually pre-provisioned
	_, err := admin.GetTopic(ctx, &pubsubpb.GetTopicRequest{Topic: topicName})
	if err != nil {
		if status.Code(err) == codes.NotFound {
			// Try to create it
			_, err = admin.CreateTopic(ctx, &pubsubpb.Topic{Name: topicName})
			if err != nil {
				// If it fails, check if recent concurrent creation occurred
				if status.Code(err) != codes.AlreadyExists {
					return fmt.Errorf("failed to create topic: %v", err)
				}
			}
		} else {
			return fmt.Errorf("failed to check if topic exists: %v", err)
		}
	}

	// Use Publisher client for the topic
	t := c.client.Publisher(topicID)
	defer t.Stop()

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %v", err)
	}

	result := t.Publish(ctx, &pubsub.Message{
		Data: jsonData,
	})

	id, err := result.Get(ctx)
	if err != nil {
		return fmt.Errorf("failed to publish message: %v", err)
	}
	fmt.Printf("Published message ID=%s to topic=%s\n", id, topicID)
	return nil
}

func (c *Client) Close() error {
	return c.client.Close()
}
