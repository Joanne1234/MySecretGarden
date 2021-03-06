function getHeader() {
    return({
        Accept: "application/json",
        "Content-Type": "application/json",
        "auth-token": sessionStorage.getItem('authToken')
    })
}

function getRefreshHeader() {
    return({
        Accept: "application/json",
        "Content-Type": "application/json",
        "refresh-token": sessionStorage.getItem('refreshToken')
    })
}

function getRefreshParams() {
    return({
        "method": "GET",
        "headers": getRefreshHeader()
    })
}

function getGETParams() {
    return({
        "method": "GET",
        "headers": getHeader()
    })
}

function getPOSTParams(post) {
    return({
        "method": "POST",
        "headers": getHeader(),
        "body": JSON.stringify({
            "post": post
        })
    })
}

function getPATCHParams(patch) {
    return({
        "method": "PATCH",
        "headers": getHeader(),
        "body": JSON.stringify({
            "post": patch
        })
    })
}

function getDELETEParams() {
    return({
        "method": "DELETE",
        "headers": getHeader()
    })
}


export { 
    getGETParams, 
    getPOSTParams, 
    getPATCHParams, 
    getDELETEParams,
    getRefreshParams
}