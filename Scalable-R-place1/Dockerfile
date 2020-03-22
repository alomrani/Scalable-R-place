FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#RUN apt update
#RUN apt install python3-pip
RUN apt-get update && apt-get install -y \
    python3-pip

RUN pip3 install awscli --upgrade --user
COPY package*.json ./
COPY *.sh ./
RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 8080
EXPOSE 8081
CMD [ "npm", "start" ]

