const socket = io()

// elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector("#send-location")
const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const {username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // New message element 
    const $newMessage = $messages.lastElementChild

    // Height of the new message (it's an html element)
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin =  parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight +  newMessageMargin

    // Visible height (what my browser is able to render)
    const visibleHeight =  $messages.offsetHeight

    // Height of messages container (height of all the messages combined)
    const containerHeight = $messages.scrollHeight

    // How far down user has scrolled (the already scrolled height + the legth of whats visible)
    const scrollOffset = $messages.scrollTop + visibleHeight

    // containerHeight already contains the new message, therefor we have to subsctract that
    // to check whether we were at the bottom
    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }

}

// listener for incoming messages to socket
socket.on('message', (message) => {
    console.log(message) // logs socket into console
    // renders message as html in the messages div
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')   
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// listener for incoming locationMessages to socket
socket.on('locationMessage', (locationMsg) => {
    const html = Mustache.render(locationTemplate, {
        username: locationMsg.username,
        location: locationMsg.location,
        createdAt: moment(locationMsg.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

// listener of submit messages button
$messageForm.addEventListener('submit', (e) => {
    // stops the browser from refreshing as we submit a form
    e.preventDefault()
    // disable button until acknowledgement
    $messageFormButton.setAttribute('disabled', 'disabled')

    // extracts the contain of the message from the input form
    const message = e.target.elements.message.value

    // emits a sendMessage event with the message through the active socket
    // as no acknowledgment but for errors is defined, callback function refers only errors
    socket.emit('sendMessage', message, (error) => {
        // enables button back in case it was disabled from sending our message
        $messageFormButton.removeAttribute('disabled')
        // cleans input for new messages
        $messageFormInput.value = ''
        // takes focus back to input
        $messageFormInput.focus()
        if (error) {
            return console.log(error)
        }
        console.log('message delivered!')
    })
})

// listener for submiting location
$locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your brower.')
    }
    $locationButton.setAttribute('disabled', 'disabled')
    // extract locations and send in callback function, promises are not supported by navigator.geolocation
    navigator.geolocation.getCurrentPosition((position) => {

        let location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }

        // emits a sendLocation
        socket.emit('sendLocation', location, () => {
            console.log('location sent!')
            $locationButton.removeAttribute('disabled')
        })
    })
})


socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})