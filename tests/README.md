# Tests (in-progress)

E2E tests use headless Chrome, Puppeteer and Jest.

The host to run tests against defaults to localhost. If you want to run tests against a different server, declare the value of `FRIP` in front of the `npm run test` command.
```
npm run test
# or FRIP=192.178.1.10 npm run test
```


