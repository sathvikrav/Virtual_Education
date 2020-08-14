require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')

var votestorage= new Map()
var count=0
var duplicates= new Map()
var current=''





const app = express()
const port = process.env.PORT || 4000

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Welcome to the Unsplash Chatbot for Zoom! Please install this bot in your class chat. Have students enter "next" when they wish to vote on another question. Enter slash teacherview at the end of this url to view the results of question entering and voting. Please note that simply pressing the voting buttons will not lead to a response from the chatbot on the chat')
  
})

app.get('/teacherview', (req, res) => {
  res.send(votestorage)
  
})



app.get('/authorize', (req, res) => {
  res.redirect('https://zoom.us/launch/chat?jid=robot_' + process.env.zoom_bot_jid)
})

app.get('/support', (req, res) => {
  res.send('Contact tommy.gaessler@zoom.us or any of us at our contact information for support.')
})

app.get('/privacy', (req, res) => {
  res.send('The Unsplash Chatbot for Zoom does not store any user data.')
})

app.get('/terms', (req, res) => {
  res.send('By installing the Unsplash Chatbot for Zoom, you are accept and agree to these terms...')
})



app.get('/zoomverify/verifyzoom.html', (req, res) => {
  res.send(process.env.zoom_verification_code)
})

app.post('/unsplash', (req, res) => {
  
 
  
  var replytype=''
  
 
  if(count==0)
  {
     if(('cmd' in req.body.payload)==false  || req.body.payload.cmd.equals('next'))
     {
        getChatbotToken2()
     }
    
     else
     {

     votestorage.set(req.body.payload.cmd,0)

     for (let key of votestorage.keys()) {
    
      if(duplicates.has(key)==false)
      {
         current=key
         break
      }
      
  
    }
     replytype='Your question'
     duplicates.set(current,votestorage.get(current))
     
     getChatbotToken()
     
     
     count=count+1
    }
  }
  else
  {
    if(('cmd' in req.body.payload)==false && ('actionItem' in req.body.payload==true))
    {
       if(req.body.payload.actionItem.value.equals('upvote'))
       {
           let number=votestorage.get(current)
           number++
           votestorage.set(current,number)
          
       }
       else 
       {
        if(req.body.payload.actionItem.value.equals('downvote'))
        {
        let number=votestorage.get(current)
        number--
        votestorage.set(current,number)
        }

       }
       
    }
    else if (('cmd' in req.body.payload)==true && req.body.payload.cmd.equals('next'))
    {
       duplicates.set(current,votestorage.get(current))
       replytype='Your request for another question to vote on has been recorded'
       var done=true
       for (let key of votestorage.keys()) {
    
        if(duplicates.has(key)==false)
        {
           current=key
           done=false
           break
        }
       
      }

      if(done==true)
      {
         getChatbotToken2()
      }
      else
      {
        getChatbotToken()
      }


    }
    else
    {
      replytype='Your question has been recorded'
      votestorage.set(req.body.payload.cmd,0)
      getChatbotToken()

    }
   

  }

  
  function getChatbotToken () {
    request({
      url: `https://api.zoom.us/oauth/token?grant_type=client_credentials`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.zoom_client_id + ':' + process.env.zoom_client_secret).toString('base64')
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log('Error getting chatbot_token from Zoom.', error)
      } else {
        body = JSON.parse(body)
        sendChat(body.access_token)
      }
    })

  }
  function getChatbotToken2 () {
    request({
      url: `https://api.zoom.us/oauth/token?grant_type=client_credentials`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.zoom_client_id + ':' + process.env.zoom_client_secret).toString('base64')
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log('Error getting chatbot_token from Zoom.', error)
      } else {
        body = JSON.parse(body)
        sendChatError(body.access_token)
      }
    })

  }
  function sendChatError (chatbotToken) {
    request({
      url: 'https://api.zoom.us/v2/im/chat/messages',
      method: 'POST',
      json: true,
      body: {
        'robot_jid': process.env.zoom_bot_jid,
        'to_jid': req.body.payload.toJid,
        'account_id': req.body.payload.accountId,
        'content': {
          'head': {
            
            'text': 'Error:'
          },
          'body': {
            'type': 'message',
            'text': 'There are no more questions currently left to vote on, please type one below'

            
          }
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + chatbotToken
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log('Error sending chat.', error)
      } else {
        console.log(body)
      }
    })
  }

  
  
  function sendChat (chatbotToken) {
    request({
      url: 'https://api.zoom.us/v2/im/chat/messages',
      method: 'POST',
      json: true,
      body: {
        'robot_jid': process.env.zoom_bot_jid,
        'to_jid': req.body.payload.toJid,
        'account_id': req.body.payload.accountId,
        'content': {
          'head': {
            'sub_head': {
              'text': current
            },
            'text': replytype+'Now, please click the button to upvote or downvote the above question'
          },
          'body': [{
            'type': 'actions',
            'items': [
                {
                    'style': 'Danger',
                    'text':'Upvote',
                    'value':'upvote'
                },

                {
     
                    'style': 'Danger',
                    'text':'Downvote',
                    'value':'downvote'
                },
                {
     
                  'style': 'Danger',
                  'text':'No Opinion',
                  'value':'none'
                }

            ]
          }]
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + chatbotToken
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log('Error sending chat.', error)
      } else {
        console.log(body)
      }
    })
  }
})

app.post('/deauthorize', (req, res) => {
  if (req.headers.authorization === process.env.zoom_verification_token) {
    res.status(200)
    res.send()
    request({
      url: 'https://api.zoom.us/oauth/data/compliance',
      method: 'POST',
      json: true,
      body: {
        'client_id': req.body.payload.client_id,
        'user_id': req.body.payload.user_id,
        'account_id': req.body.payload.account_id,
        'deauthorization_event_received': req.body.payload,
        'compliance_completed': true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(process.env.zoom_client_id + ':' + process.env.zoom_client_secret).toString('base64'),
        'cache-control': 'no-cache'
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log(error)
      } else {
        console.log(body)
      }
    })
  } else {
    res.status(401)
    res.send('Unauthorized request to Unsplash Chatbot for Zoom.')
  }
})

app.listen(port, () => console.log(`Unsplash Chatbot for Zoom listening on port ${port}!`))