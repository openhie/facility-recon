FROM node:boron

WORKDIR /src/
RUN npm install -g http-server

# add app
ADD ./dist/ /src/

CMD ["http-server"]