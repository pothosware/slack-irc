var _ = require('lodash');
var irc = require('irc');
var logger = require('winston');
var SlackGateway = require('./slack-gateway');

function Bot() {
  this.server = process.env.IRC_SERVER;
  this.nickname = process.env.BOT_NICK;
  this.channelMapping = JSON.parse(process.env.CHANNEL_MAPPING);
  this.channels = _.values(this.channelMapping);

  logger.debug('Connecting to IRC');
  this.client = new irc.Client(this.server, this.nickname, {
    channels: this.channels
  });

  this.slackGateway = new SlackGateway();
  this.attachListeners();
}

Bot.prototype.attachListeners = function() {
  this.client.addListener('registered', function(message) {
    logger.debug('Registered event: ', message);
  });

  this.client.addListener('message', function(from, to, message) {
    logger.debug('Received a message from Slack', from, to, message);
    this.slackGateway.sendToSlack(from, to, message);
  }.bind(this));

  this.client.addListener('error', function(error) {
    logger.error('Received error event from IRC', error);
  });
};

function ensureHash(channel) {
  if (channel[0] !== '#') channel = '#' + channel;
  return channel;
}

Bot.prototype.sendMessage = function(from, channel, message) {
  var ircChannel = this.channelMapping[ensureHash(channel)];
  if (ircChannel) {
    logger.debug('Sending message to IRC', from, channel, message);
    this.client.say(ircChannel, from + ': ' + message);
  }
};

module.exports = Bot;