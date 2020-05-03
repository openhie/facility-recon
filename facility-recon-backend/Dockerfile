FROM node:erbium-slim

# install dependencies
ADD package-lock.json /src/
ADD package.json /src/
WORKDIR /src/
RUN npm install

# add app
ADD . /src/

CMD ["npm", "start"]