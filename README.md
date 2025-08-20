# 🌦️ Weather Visualization – Full Stack Application
See the weather, understand the world  

Weather Visualization is a business-grade platform for **interactive weather exploration and visualization**, built with **Angular**, **Spring Boot 3.5.4**, and **MongoDB**.  
It combines secure authentication, scalable design, and real-time geocoding integration into a modern, cloud-ready solution.

---

## 🧠 Executive Summary
Weather Visualization is designed as a **distributed, cloud-ready full stack application**.  
It integrates **location search, historical and real-time weather data, and OAuth2-based identity** into a cohesive, high-performance platform.

The platform emphasizes:  
- **Scalability** – Cloud deployment-ready with modular architecture.  
- **Security** – OAuth2 (Google & GitHub) with session-based authentication (no JWT).  
- **Data-driven insights** – Weather data sourced via external APIs and cached in MongoDB.  
- **Great UX** – Angular frontend for responsive, reactive data visualization.  

---

## 🌐 Architectural Principles
- **Separation of Concerns** – clean split between frontend, backend, and persistence.  
- **External API Integration** – geocoding & weather APIs (Open-Meteo).  
- **Spring Security with OAuth2 login** – sessions managed by Spring Security (no JWT).  
- **Resiliency** – error handling & caching to ensure consistent UX.  
- **Cloud-Ready** – Dockerizable, easily deployable to Kubernetes or container services.  

---

## 🔗 Service Portfolio

| Service         | Responsibility                                 | Tech Highlights |
|-----------------|-------------------------------------------------|-----------------|
| **ui**          | Angular 17 frontend for weather visualizations | OAuth2-protected routes, charts, responsive UI |
| **backend**     | Spring Boot 3.5.4 API & business logic         | Spring Security OAuth2, REST endpoints |
| **auth**        | Google & GitHub OAuth2 login, session storage  | Entities: `AppUser`, `ExternalIdentity`, `AuthProvider`, `UserStatus` |
| **location**    | Geocoding via Open-Meteo, cached in MongoDB    | REST client, caching layer |
| **database**    | Weather & location persistence                 | MongoDB, Spring Data |

---

## 🧰 Technology Stack

| Layer        | Technology |
|--------------|------------|
| **Frontend** | 🅰️ Angular 17, TypeScript |
| **Backend**  | ☕ Spring Boot 3.5.4 (Java 21), Maven |
| **Auth**     | 🔐 OAuth2 (Google & GitHub), Spring Security sessions |
| **Database** | 🍃 MongoDB (containerized) |
| **API**      | 🌍 Open-Meteo Geocoding & Weather API |
| **DevOps**   | 🐳 Docker, Docker Compose |

---

## 🗺️ High-Level Architecture
**Interaction Flow:**
1. User logs in via **Google or GitHub OAuth2**.  
2. Spring Security creates & manages user session.  
3. User data stored in `AppUser` + linked `ExternalIdentity`.  
4. Angular frontend consumes secured endpoints.  
5. Backend queries **Open-Meteo APIs** for weather & geocoding data.  
6. Results cached in MongoDB for performance.  

---

## 🔐 Security Design
- **OAuth2 Authorization Code Flow** (Google, GitHub).  
- **Spring Security session management**.  
- **Persistent Users**: Stored in MongoDB (`AppUser`, `ExternalIdentity`).  
- **Equal Privileges** – all authenticated users share equal privileges.  

---

## 🚀 Local Development Workflow
### Start App
```bash
mvn clean install
docker-compose up --build
```
Runs on: `http://localhost:80`

---

## 🖼️ Frontend Features
- Reactive Angular UI.  
- Interactive weather charts (temperature, humidity, precipitation).  
- Location-based weather search.  
- Responsive design for mobile & desktop.  
- Secure login flow.  

---

## 📂 Repository Layout
```
WeatherVisualization/
├── backend/
│   ├── src/
│   │   ├── main/java/com/milosz/podsiadly/backend/
│   │   │   │   ├── auth/
│   │   │   │   ├── config/
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── mapper/
│   │   │   │   ├── repository/
│   │   │   │   ├── security/
│   │   │   │   ├── service/
│   │   │   │   └── BackendApplication.java
│   │   │   └──resources/
│   │   └── test/
│   │ 
│   ├── target/
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/
│   ├── web/
│   │   ├── .angular/
│   │   ├── dist/
│   │   ├── node/
│   │   ├── node_modules/
│   │   ├── src/
│   │   ├── angular.json
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.spec.json
│   │   
│   ├── Dockerfile  
│   ├── nginx.conf  
│   └── pom.xml       
├── .env   
├── docker-compose.yml
├── mvnw
├── mvnw.cmd
├── README.md
└── settings.xml

```

---

## 🧑‍💻 Maintainer
**Milosz Podsiadly**  
📧 m.podsiadly99@gmail.com  
🔗 [GitHub – MiloszPodsiadly](https://github.com/MiloszPodsiadly)

---

## 📜 License
Licensed under the [**MIT License**](https://opensource.org/licenses/MIT).
