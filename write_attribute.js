const {cap, resolveTyped} = require('./utils')



module.exports =  function(RED) {
    function MatterWriteAttr(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.controller = RED.nodes.getNode(config.controller);
        if (!config.device || config.device === "__SELECT__") {
            node.warn("Device not configured")
            return
        }
        node._id = BigInt(config.device.split('-')[0])
        node._ep = config.device.split('-')[1] || 1
        node.cluster = Number(config.cluster)
        node.attr = cap(config.attr)
        this.on('input', function(msg) {
            if (!node.controller || !node.controller.commissioningController) {
                node.error('Matter controller not available — check that the controller is configured and deployed')
                return
            }
            resolveTyped(RED, config.data, config.dataType, node, msg)
            .then((_data) => {
                node.controller.commissioningController.connectNode(node._id).then((conn) => {
                    const ep = conn.getDeviceById(Number(node._ep))
                    const clc = ep.getClusterClientById(Number(node.cluster))               
                    try {
                        const methodName = `set${node.attr}Attribute`
                        let command = clc[methodName]
                        if (typeof command !== 'function') {
                            node.error(`Attribute setter '${methodName}' not found on cluster ${node.cluster}`)
                            return
                        }
                        command.call(clc, _data)
                        .then((attr_resp) => {
                            node.log(attr_resp)
                            msg.payload = 'ok'
                            node.send(msg)
                        })
                        .catch((e) => node.error(e))
                    } catch (error) {
                        node.error(error)
                    }
                })
                .catch((e) => node.error(e))
            })
            .catch((e) => {
                node.error(e)
            })
        })
    }   

    RED.nodes.registerType("matterwriteattr",MatterWriteAttr);

}