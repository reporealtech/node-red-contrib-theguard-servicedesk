module.exports = function(RED) {
    function sdConfig(n) {
        RED.nodes.createNode(this,n);
        this.url = n.url;
        this.user = n.user;
        this.password = n.password;
    }
    RED.nodes.registerType("sd-config",sdConfig,{
		credentials: {
		  password: {type:"password"}
		}
	});
}