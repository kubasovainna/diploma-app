FROM node:17

# создание директории приложения
WORKDIR /usr/app

# установка зависимостей
# символ астериск ("*") используется для того чтобы по возможности
# скопировать оба файла: package.json и package-lock.json
COPY package*.json ./

RUN npm install

# копируем исходный код
COPY . .

EXPOSE 8080
CMD [ "node", "index.js" ]