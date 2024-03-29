FROM node:5.3.0

COPY . /usr/local/products-api

WORKDIR /usr/local/products-api

RUN npm install

EXPOSE 8080

CMD ["npm", "start"]
