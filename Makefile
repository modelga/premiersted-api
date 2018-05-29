HOST?=api.premiersted.schibsted.ga

run-local:
	npx nf npm run 

build:
	docker build -t premiersted:latest .

run:
	docker rm -f api.premiersted.schibsted.ga
	docker run --name api.premiersted.schibsted.ga -d premiersted:latest

run-dev: build
	docker rm -f premiersted-dev || true
	docker run -e LETSENCRYPT_HOST=$(HOST) -e LETSENCRYPT_HOST=$(HOST) --name premiersted-dev -v $(PWD)/.env:/app/.env  -d  premiersted:latest

logs:
	docker logs -f premiersted

logs-dev:
	docker logs -f premiersted-dev
	
run:
	make -f api/Makefile run
