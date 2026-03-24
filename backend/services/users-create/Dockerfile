FROM --platform=$BUILDPLATFORM golang:1.22 AS build
WORKDIR /src
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
COPY go.mod ./
COPY go.sum ./
COPY main.go ./
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -o bootstrap main.go

FROM public.ecr.aws/lambda/provided:al2
COPY --from=build /src/bootstrap /var/runtime/bootstrap
RUN chmod +x /var/runtime/bootstrap
CMD ["bootstrap"]
