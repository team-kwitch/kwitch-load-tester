# Kwitch Load Tester

This repository uses Puppeteer to artificially increase the viewer count on the Kwitch platform and conduct load testing by simulating a large number of virtual viewers.

## Features

- Automated browser control with Puppeteer
- Generation of multiple virtual viewers and simultaneous connections
- Performance and server load testing for streaming

## Usage

1. Install dependencies:

```sh
pnpm install
```

2. Run the script with the following command:

```sh
node index.js <username> [viewerCount] [batchSize]
```
- <username>: The target channel's username (required).
- [viewerCount]: The total number of virtual viewers to create (default: 50).
- [batchSize]: The number of viewers created per batch (default: 10).

## Example
To simulate 100 viewers in batches of 20 for the channel "test_channel":

```sh
node index.js test_channel 100 20
```
