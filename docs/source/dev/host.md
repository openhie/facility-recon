# Hosting Considerations

Systems planners should test locally with the largest data sources that would represent their use case. With no user interaction, the demo server uses ~740MB of RAM (mongo: 200MB, redis: 10MB, hearth: 250MB, backend: 250MB, frontend: 30MB).

The demo version uses 2 virtual CPUs, 4GB RAM, and 20GB SSD in a cloud-hosted VPS. For use cases with large data sources, such as 10k facilities, expect to increase RAM allocation. 