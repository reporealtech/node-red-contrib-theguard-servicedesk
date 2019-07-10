![Platform Node-RED](http://b.repl.ca/v1/Platform-Node--RED-red.png)
![Node-RED theguard-servicedesk](http://b.repl.ca/v1/Node--RED-theguard--servicedesk-orange.png)
[![NPM version](https://badge.fury.io/js/node-red-contrib-theguard-servicedesk.png)](https://www.npmjs.com/package/node-red-contrib-theguard-servicedesk)
![NodeJS_Version](http://b.repl.ca/v1/NodeJS-LTS-green.png)

# node-red-contrib-theguard-servicedesk

## Connect your REALTECH theGuard! ServiceDesk to a Node-RED server 

[Node-RED][1] contribution package for REALTECH theGuard! ServiceDesk

## Install

This assumes you have [Node-RED](https://nodered.org) already installed and working, if you need to install Node-RED see [here](https://nodered.org/docs/getting-started/).

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-theguard-servicedesk

Run the following command for global install

    npm install -g node-red-contrib-theguard-servicedesk

try these options on npm install to build, if you have problems to install

    --unsafe-perm --build-from-source
    
## Included Nodes

The installed nodes have more detailed information in the Node-RED info pane shown when the node is selected. Below is a quick summary.

### Export Problems - `problem-export`

Export all problem tickets from REALTECH theGuard! ServiceDesk.

![Flow Example](images/screenshot-ticket-export-1.png)

### Manipulate Problems - `problem-upsert`

Start/update a problem ticket in REALTECH theGuard! ServiceDesk.

## Debug

Debug will be activated by starting Node-RED with debug mode:

    DEBUG=dot4-client node-red -v


[1]:https://nodered.org
