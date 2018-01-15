FROM node:8.9.4-alpine
RUN npm i -g npm foreman
WORKDIR  /app
CMD npx nf run node app
EXPOSE 80
ENV TZ="Europe/Warsaw"
ENV LETSENCRYPT_EMAIL=mateusz@odel.ga
ARG host=api.premiersted.schibsted.ga
ENV LETSENCRYPT_HOST ${host}
ENV VIRTUAL_HOST ${host}
USER root
ADD package.json yarn.lock /app/
RUN yarn --prod --pure-lockfile
ADD . /app/