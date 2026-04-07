# SDC Assemblies Library

A full-stack web application designed for **Steven Douglas Corp.** to manage and search SolidWorks assembly records. This tool provides a modern, high-performance interface for engineers to track categories, statuses, preferences, and SDC standards.

## 🚀 Features
- **Fast Search**: Search by part number, job, or description with instant results.
- **Bulk Management**: Update or delete multiple assembly records at once.
- **Dynamic Theme**: Supports both light and dark modes with a premium aesthetic.
- **Infinite Scrolling**: Handles thousands of records smoothly without paging.
- **Azure Integration**: Built to run on Azure Static Web Apps for the frontend and Azure App Service (Linux) for the backend API.

## 🛠 Tech Stack
- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Database**: [Microsoft SQL Server](https://www.microsoft.com/sql-server) (Azure SQL)
- **Deployment**: [Azure Static Web Apps](https://azure.microsoft.com/services/static-web-apps/)

## 📂 Project Structure
- `client/`: React source code, components, hooks, and static assets.
- `server/`: Express API source, routes, and database controller.
- `migrate.sql`: SQL migration script to update the database schema for editable fields.

## 📦 Setup & Installation

### Prerequisites
- Node.js (v18+)
- An Azure SQL Database

### Local Development
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up your environment:
   Create a `.env` file in the root directory (use `.env.example` as a template):
   ```env
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_SERVER=your_server.database.windows.net
   DB_NAME=your_db
   PORT=3001
   ```
3. Run the development server (runs both frontend and backend concurrently):
   ```bash
   npm run dev
   ```

## ☁️ Deployment (Azure)

### Frontend (Azure Static Web Apps)
1. Push this repository to GitHub.
2. In the Azure Portal, create a new **Static Web App**.
3. Point it to your GitHub repository and set the following build details:
   - **App location**: `/client`
   - **Output location**: `dist`
4. Once deployed, link your backend via **Settings > APIs > Production > Link**.

### Backend (Azure Web App)
1. Deploy the `server/` folder to an **Azure App Service (Linux)**.
2. Ensure you add the database environment variables to the **Settings > Configuration** section in the Azure Portal.

## 📝 License
Proprietary — Developed for Steven Douglas Corp.
