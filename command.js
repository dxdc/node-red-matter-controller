

module.exports =  function(RED) {
    function MatterCommand(config) {
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
        node.command = config.command
        this.on('input', function(msg, send, done) {
            if (!node.controller || !node.controller.commissioningController) {
                done('Matter controller not available — check that the controller is configured and deployed')
                return
            }
            let _data
            let evalError = false
            RED.util.evaluateNodeProperty(config.data, config.dataType, node, msg, (err, result) => {
                if (err) {
                    evalError = true
                    done(err)
                } else {
                    _data = result
                }
            })
            if (evalError) return
            node.controller.commissioningController.connectNode(node._id)
            .then((conn) => {
                const ep = conn.getDeviceById(Number(node._ep))
                const clc = ep.getClusterClientById(Number(node.cluster))
                let command = clc.commands[node.command]
                if (typeof command !== 'function') {
                    done(`Command '${node.command}' not found on cluster ${node.cluster}`)
                    return
                }
                if (_data == null || (typeof _data === 'object' && Object.keys(_data).length === 0)){
                    command()
                    .then(() => {
                        msg.payload = 'ok'
                        node.send(msg)
                        done()
                    })
                    .catch((e) => done(e))
                } else {
                    command(_data)
                    .then(() => {
                        msg.payload = 'ok'
                        node.send(msg)
                        done()
                    })
                    .catch((e) => done(e))
                }
            })
            .catch((e) => done(e))
        })
    }   

    RED.nodes.registerType("mattercommand",MatterCommand);

}
