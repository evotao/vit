.PHONY: install install-user test test-node clean

install:
	bun install

install-user:
	bun link

test: test-node
	bun test

test-node:
	node bin/vit.js --help > /dev/null
	node bin/vit.js --version > /dev/null

clean:
	rm -rf node_modules/

publish:
	npm publish
