DOCKER_ID := $(shell docker ps -aq)
DOCKER_IMAGE_ID := $(shell docker images -q)
DOCKER_VOLUME := $(shell docker volume ls -q)
PWD := $(shell pwd)

all:
	sed -i '' 's|^\(FE_VOL_PATH\).*|FE_VOL_PATH=$(PWD)/front/srcs|' "./.env"
	docker compose up -d

up:
	docker compose up -d

down:
	docker compose down

re: fclean
	make all

fclean:
	$(if $(DOCKER_ID), docker rm -f $(DOCKER_ID))
	$(if $(DOCKER_VOLUME), docker volume rm $(DOCKER_VOLUME))
	docker rmi -f nginx
# docker system prune -af
# $(if $(DOCKER_IMAGE_ID), docker rmi $(DOCKER_IMAGE_ID))

django:
	docker compose run -it django sh

.PHONY: all up down re fclean
