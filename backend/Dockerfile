
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml ./pom.xml
COPY backend/pom.xml ./backend/pom.xml
COPY backend/src ./backend/src
COPY frontend/pom.xml ./frontend/pom.xml

RUN mvn -q -DskipTests -pl backend -am package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /build/backend/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]