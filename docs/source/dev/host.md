# Production considerations

## System Resources

Systems planners should test locally with the largest data sources that would represent their use case. With no user interaction, the demo server uses ~740MB of RAM (mongo: 200MB, redis: 10MB, hearth: 250MB, backend: 250MB).

The demo version uses 2 virtual CPUs, 4GB RAM, and 20GB SSD in a cloud-hosted VPS. For use cases with large data sources, such as 10k facilities, expect to increase RAM allocation.

## DNS

DNS can be configured a myriad of ways for hosting. One method is to create a DNS record for the domain and then add an `A` record under the root domain for the application server.

## Reverse Proxy and HTTPS

To host the tool behind a reverse proxy like nginx, configure it to pass requests to the nodejs server running the application on port 3000.

A full recipe for reverse proxy and SSL is here: https://www.linode.com/docs/web-servers/nginx/use-nginx-reverse-proxy/

If using Ubuntu with Nginx, you may have to disable Apache.
```sh
sudo update-rc.d apache2 disable
```

