FROM --platform=$BUILDPLATFORM golang:1.22 AS build
WORKDIR /src
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -o bootstrap .

FROM public.ecr.aws/lambda/provided:al2
RUN yum install -y amazon-linux-extras && \
    amazon-linux-extras install epel -y && \
    yum install -y ffmpeg poppler-utils && \
    yum clean all && rm -rf /var/cache/yum
COPY --from=build /src/bootstrap /var/runtime/bootstrap
RUN chmod +x /var/runtime/bootstrap
CMD ["bootstrap"]
