const USER_KEY = 'user'

export const getUser = () => {
    let user = sessionStorage.getItem(USER_KEY)
    
    if (!user) {
        return {}
    }
    return JSON.parse(user) || {}
}

export const setUser = (data) => {
    if (typeof data !== 'object') {
        data = {
            playerName: ''
        }
    }
    // userId
    data.id = getUser().id || new Date().getTime()
    sessionStorage.setItem(USER_KEY, JSON.stringify(data))
}

export const clearUser = () => {
    sessionStorage.removeItem(USER_KEY)
}