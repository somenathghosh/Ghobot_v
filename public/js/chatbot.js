
var ChatBot = (function ($) {
    "use strict";
    //// common vars
    // custom patterns and rewrites
    if ($ === undefined){
        console.log('Jquery is NOT loaded!');
    }
    var patterns;

    // the bot's name
    var botName;

    // the human's name
    var humanName;

    // the html (text / image etc.) that is displayed when the bot is busy
    var thinkingHtml;

    // a selector to all inputs the human can type to
    var inputs;

    // whether to list the capabilities below the input field
    var inputCapabilityListing;

    // the example phrases that can be said (to be listed under the input field)
    var examplePhrases = [];

    // the engines to use for answering queries that are not caught by simple patterns
    var engines;

    // whether a sample conversation is running
    var sampleConversationRunning = false;

    // a callback for after a chat entry has been added
    var addChatEntryCallback;

    // list all the predefined commands and the commands of each engine
    function updateCommandDescription() {
        var description = '';

        // first explain manually defined commands and then all by all used engines
        var descriptions = [];
        var i, j;

        //console.log(engines);

        ChatBot.getCapabilities(function(data){

          //console.log('from updateCommandDescription', data);

          for (j = 0; j < data.capabilities.length; j++) {
              descriptions.push(data.capabilities[j]);
          }

          examplePhrases = [];
          for (i = 0; i < descriptions.length; i++) {
              var pdesc = descriptions[i].replace(/(['"][^'"]+['"])/gi, '<span class="phraseHighlight">$1</span>');
              pdesc = pdesc.replace(/(\[[^\[\]]+\])/gi, '<span class="placeholderHighlight">$1</span>');
              //console.log(pdesc);
              var matches = pdesc.match(/<span class=['"]phraseHighlight["']>['"](.+?)['"]<\/span>/gi);
              //console.log(matches);
              if (matches !== null) {
                  //console.log(matches);
                  for (j = 0; j < matches.length; j++) {
                      var cleanMatch = matches[j].replace(/<\/?span[^>]*>/gi,'');
                      examplePhrases.push(cleanMatch.replace(/['"]/gi,''));
                  }
              }
              description += '<div class="commandDescription">' + pdesc + '</div>';
          }

          var datalist = $('#chatBotCommands');
          if (datalist.size() === 0) {
              datalist = $('<datalist id="chatBotCommands">');
              $('body').append(datalist);
          } else {
              datalist.html('');
          }

          for (i = 0; i < examplePhrases.length; i++) {
              datalist.append($('<option value="'+examplePhrases[i]+'"></option>'));
          }
          $('#chatBotCommandDescription').html(description);

        });
    }

    // type writer
    function playConversation(state, pauseLength) {

        setTimeout(function() {
            var newValue = '';
            if ($(inputs).val() !== '|') {
                newValue += $(inputs).val();
            }
            newValue += state.currentInput.slice(state.start,state.start+1);
            $(inputs).val(newValue);
            state.start++;

            if (state.start < state.currentInput.length) {
                // keep typing
                playConversation(state, pauseLength);
            } else {

                // press enter and wait for some time and then write the next entry
                ChatBot.addChatEntry(state.currentInput, [],"human");
                ChatBot.react(state.currentInput);
                $(inputs).val(state.currentInput);

                setTimeout(function() {
                    state.conversationArrayIndex++;
                    state.conversationArrayIndex = state.conversationArrayIndex % state.conversationArray.length;

                    // did we cycle through the conversation array? if so, stop
                    if (state.conversationArrayIndex === 0) {
                        $('#chatBotConversationLoadingBar').remove();
                        sampleConversationRunning = false;
                        return;
                    }

                    state.start = 0;
                    $(inputs).val('|');
                    state.currentInput = state.conversationArray[state.conversationArrayIndex];
                    playConversation(state, pauseLength);
                }, pauseLength);

                var chclb = $('#chatBotConversationLoadingBar');
                if (chclb.size() === 0) {
                    chclb = $('<div id="chatBotConversationLoadingBar"></div>');
                    chclb.css('position','absolute');
                    $('body').append(chclb);
                }

                var left =  $(inputs).offset().left;
                var top = $(inputs).offset().top + $(inputs).outerHeight() - 3;
                chclb.css('left',left+'px');
                chclb.css('top',top+'px');

                chclb.animate({
                    width: $(inputs).outerWidth()+'px',
                }, pauseLength, function() {
                    chclb.css('width','0');
                });

            }
        }, Math.random()*120+10);
    }

    return {
        Engines: {

        ghobot: function () {

            // patterns that the engine can resolve
            var capabilities = [];

            return {
                react: function (query,callback) {
                      var q= {};
                      q.query=query;
                      $.ajax({
                          type: 'POST',
                          data: JSON.stringify(q),
                          contentType: 'application/json',
                          url: '/gQuery',
                          success: function(data) {


                              var content = data.AbstractText;
                              var suggestion = [];
                              if (content === '' ) {

                                if(data.RelatedTopics.length > 0){

                                  console.log('Engine/react ===>', data);
                                  content = '';

                                  var media = [];
                                  for (var i = 0; i < data.RelatedTopics.length; i++) {
                                      var ob = data.RelatedTopics[i];
                                      if (ob.Result === undefined) {
                                          continue;
                                      }
                                      if(ob.Icon && ob.Icon.URL ){
                                        if (ob.Icon.URL !== '' && ob.Icon.URL.indexOf(".ico") < 0) {
                                            media.push(ob.Icon.URL);
                                        }
                                      }
                                      content += ob.Result.replace("</a>", "</a> ") ;
                                      console.log(content);
                                      var txt = ob.Text;
                                      for (var t=0; t < txt.length; t++){
                                        suggestion.push( txt[t].replace("</a>", "</a> "));
                                      }


                                  }

                                  for (i = 0; i < media.length; i++) {
                                      var m = media[i];
                                      content += '<img src="' + m + '" style="margin-right:5px"/>';
                                  }
                                }
                                else{
                                  content = '';
                                }

                              } else {

                                  if (data.Image !== undefined && data.Image !== '') {

                                      content += '<br>';

                                      content += '<div class="imgBox">' +
                                          '<img src="' + data.Image + '" />' +
                                          '<div class="title">' + data.Heading + '</div>' +
                                          '</div>';

                                  }

                              }

                              suggestion = new Array().concat.apply([],suggestion);
                              //console.log(suggestion);
                              callback(null,content,suggestion,'bot');
                              //ChatBot.addChatEntry(content, "bot");
                              ChatBot.thinking(false);


                          },
                          error: function (error) {
                              console.log(error);
                              callback(error,'',[],'bot');
                              //ChatBot.addChatEntry('', "bot");
                              ChatBot.thinking(false);
                          }

                      });

                  },
                  getCapabilities: function (callback) {
                    var q= {};
                    q.query='cap';
                    $.ajax({
                        type: 'POST',
                        data: JSON.stringify(q),
                        contentType: 'application/json',
                        url: '/gCap',
                        success: function(data) {
                          capabilities = data;
                          //console.log('Engine/getCapabilities ===>' , data);
                          callback(data);
                        },
                        error: function (error) {
                            console.log(error);
                            callback('',[]);

                        }
                      });



                  },

              };
          }
        },
        init: function (options) {
            var settings = jQuery.extend({
                // these are the defaults.
                botName: 'Bot',
                humanName: 'You >',
                thinkingHtml: '<img src="data:image/gif;base64,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"/>',
                inputs: '',
                inputCapabilityListing: true,
                engines: [],
                patterns: [],
                addChatEntryCallback: function(entryDiv, text, origin) {
                    entryDiv.addClass('appear');
                }
            }, options);

            botName = settings.botName;
            humanName = settings.humanName ;
            thinkingHtml = settings.thinkingHtml;
            inputs = settings.inputs;
            inputCapabilityListing = settings.inputCapabilityListing;
            engines = settings.engines;
            patterns = settings.patterns;
            addChatEntryCallback = settings.addChatEntryCallback;

            // update the command description
            updateCommandDescription();

            // input capability listing?
            if (inputCapabilityListing) {
                $(inputs).attr("list", "chatBotCommands");
            }

            //Welcome message
            ChatBot.addChatEntry('Welcome to HL bot services. My name is Ghobot. How can I help you today?',['I forgot username','I Forgot password', 'I need to talk to a person' ],'bot');

            // listen to inputs on the defined fields
            $(inputs).keyup(function (e) {
                if (e.keyCode === 13) {
                    ChatBot.addChatEntry($(this).val(),[], "human");
                    ChatBot.react($(this).val());
                }

            });

        },
        setBotName: function (name) {
            botName = name;
        },
        setHumanName: function (name) {
            humanName = name + ' >';
            $('.chatBotChatEntry.human .origin').html(name);
        },
        addChatEntry: function addChatEntry(text,suggestion,origin) {
            //console.log( text, suggestion, origin);
            if (text === undefined || text === '') {
                text = 'I couldn\'t find answer for you';
            }
            var entryDiv = $('<div class="chatBotChatEntry ' + origin + '"></div>');
            entryDiv.html('<span class="origin">' + (origin === 'bot' ? botName : humanName) + '</span>' + text);
            console.log(entryDiv.html());
            $('#chatBotHistory').prepend(entryDiv);
            if (addChatEntryCallback !== undefined) {
                addChatEntryCallback.call(this, entryDiv, text, suggestion,origin);
            }
        },
        thinking: function (on) {
            var ti = $('#chatBotThinkingIndicator');
            if (on) {
                if (!sampleConversationRunning) {
                    $(inputs).attr('disabled', 'disabled');
                }
                ti.html(thinkingHtml);
            } else {
                if (!sampleConversationRunning) {
                    $(inputs).removeAttr('disabled');
                    $(inputs).val('');
                    $(inputs).focus();
                }
                ti.html('');
            }
        },
        react: function react(text) {
            this.thinking(true);
            var _this = this;
            engines.react(text,function(err,res,sug){
              console.log(res, sug);
              _this.addChatEntry(res,sug,'bot');
            });
        },
        getCapabilities: function capabilities(callback){
          engines.getCapabilities(callback);
        },
        playConversation: function (conversation, pauseLength) {

            if (pauseLength === undefined) {
                pauseLength = 3000;
            }

            if (sampleConversationRunning) {
                return false;
            }

            $(inputs).val('');

            sampleConversationRunning = true;

            var state = {
                start: 0,
                conversationArrayIndex: 0,
                conversationArray: conversation,
                currentInput: conversation[0]
            };

            playConversation(state, pauseLength);

            return true;
        }

    }
})($);
