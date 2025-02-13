FROM node:22
WORKDIR /app
COPY package.json /app/
RUN npm install

COPY . .

ENV PORT=9000

EXPOSE 9000

CMD ["node", "index.js"]
