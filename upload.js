var fs = require('fs');
var fetch = require('node-fetch');
var path = require('path')

// paste user id here
var user_id = ""
// paste secret here
var secret = ""

// staging
var host = "https://mawd-staging.aidbox.io"
// prod. uncomment this line
// var host = "https://mawd.aidbox.io"

var params = parse_params(process.argv.splice(2))
var filepath = params['--file'];
var case_id = params['--case']

// get case id from filename
if (!case_id) {
    case_id = get_name_and_ext()[0]
}

var auth_header = { 'Authorization': 'Basic ' + base64(user_id + ":" + secret) }

function base64(str) {
    var buff = new Buffer.from(str);
    return buff.toString('base64');
}

function get_name_and_ext() {
    var splitted = filepath.split(path.sep)
    return splitted[splitted.length - 1].split(".")
}

async function sign_url() {
    var [name, ext] = get_name_and_ext()
    var body = {
        "method": "billogica.document/create",
        "params": {
            "case-id": case_id, "doc": { "name": name, "ext": ext }
        }
    }

    var res = await fetch(host + "/json-rpc", {
        method: "post",
        headers: { 'Content-type': 'application/json', ...auth_header },
        body: JSON.stringify(body)
    })

    if (res.status >= 300) {
        console.log("Sign url error: " + res.status)
        console.log(res)
        return
    }

    var result = await res.json()
    return result["result"]["upload"]

}

function parse_params(params) {
    var result = {}
    params.forEach((e, i) => {
        if (i % 2 != 0)
            result[params[i - 1]] = e

    })
    return result
}

async function main() {
    try {
        if (!filepath) {
            console.log('Specify the file')
            return
        }

        var url = await sign_url();
        var stats = fs.statSync(filepath);
        var fileSizeInBytes = stats.size;
        var readStream = fs.createReadStream(filepath);
        await fetch(url, {
            method: 'put',
            // headers: {
            //     "Content-length": fileSizeInBytes
            // },
            body: readStream,
        })
        console.log(">>> URL", url)
    }
    catch (e) {
        console.log("Upload error ", e)
    }
}

main()