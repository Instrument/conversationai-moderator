FROM gcr.io/google_appengine/nodejs

RUN install_node v6.11.0

COPY . /app/

RUN export NPM_USER="tdreyno-moderator"
RUN export NPM_PASS="moderator"
RUN export NPM_EMAIL="thomas.reynolds+moderator@instrument.com"
RUN echo -e "$NPM_USER\n$NPM_PASS\n$NPM_EMAIL" | npm login

RUN npm install --unsafe-perm

EXPOSE 8080

CMD npm start
