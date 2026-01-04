# Route-Go 🚚💨

Route-Go is a comprehensive route optimization and fleet management system designed to streamline delivery operations. It combines a high-performance Go backend, a powerful Python optimization engine using Google's OR-Tools, and a modern, responsive Next.js frontend to provide a seamless experience for managing orders, vehicles, and routes.

## 🌟 Key Features

*   **Intelligent Route Optimization:** Generates optimal delivery routes using advanced algorithms (Google OR-Tools), considering vehicle capacities, time windows, and location constraints.
*   **Interactive Dashboard:** A modern UI built with Next.js, featuring interactive maps (Leaflet) for visualizing routes and stops.
*   **Real-time Management:** Add, edit, and delete orders and vehicles.
*   **Drag-and-Drop Adjustments:** (Coming Soon) fine-tune routes manually with an intuitive interface.
*   **Event-Driven Architecture:** Uses Google Cloud Pub/Sub for asynchronous communication between the Go backend and the Python optimization service.

## 🛠 Tech Stack

### Backend (API)
*   **Language:** Go (1.24+)
*   **Framework:** Gin
*   **Database Driver:** pgx (PostgreSQL)
*   **Messaging:** Google Cloud Pub/Sub Client

### Frontend (Web)
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (v4)
*   **UI Components:** Radix UI, Lucide React
*   **Maps:** React Leaflet
*   **State/Data:** Axios, React Hook Form, Zod

### Optimization Engine
*   **Language:** Python
*   **Core Library:** Google OR-Tools
*   **Data Processing:** NumPy, Pandas (implied), Scikit-learn
*   **Messaging:** Google Cloud Pub/Sub

### Infrastructure
*   **Database:** PostgreSQL
*   **Message Broker:** Google Cloud Pub/Sub (Emulator for local dev)
*   **Containerization:** Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
*   Go 1.22+
*   Node.js 20+
*   Python 3.10+
*   Docker & Docker Compose

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/E-Rombi/route-go.git
    cd route-go
    ```

2.  **Start Infrastructure (Postgres & Pub/Sub)**
    ```bash
    docker-compose up -d
    ```

3.  **Backend Setup**
    ```bash
    # Install dependencies
    go mod download

    # Run the server
    go run cmd/server/main.go
    ```

4.  **Frontend Setup**
    ```bash
    cd web
    # Install dependencies
    npm install

    # Run development server
    npm run dev
    ```
    Access the web interface at `http://localhost:3000`.

5.  **Optimization Service Setup**
    ```bash
    # Create valid python environment (optional but recommended)
    python3 -m venv venv
    source venv/bin/activate

    # Install dependencies
    pip install -r optimization/requirements.txt

    # Run the solver
    python optimization/solver.py
    ```

## 📂 Project Structure

```
route-go/
├── cmd/                # Entry points for Go applications
│   ├── server/         # Main API server
│   └── seeder/         # Database seeding utility
├── internal/           # Private application code (Go)
│   ├── api/            # HTTP handlers and routes
│   ├── db/             # Database repository and schema
│   └── pubsub/         # Pub/Sub client wrapper
├── optimization/       # Python optimization logic
├── web/                # Next.js frontend application
└── docker-compose.yml  # Local infrastructure definition
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

[MIT](LICENSE)
