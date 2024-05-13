const createConnectionSessionChat = (modelName) => {
    const outputErrorTemplate = $("#outputErrorTemplate").html();
    const outputInfoTemplate = $("#outputInfoTemplate").html();
    const outputUserTemplate = $("#outputUserTemplate").html();
    const outputBotTemplate = $("#outputBotTemplate").html();
    const outputLLamaTemplate = $("#outputLLamaTemplate").html();
    const signatureTemplate = $("#signatureTemplate").html();

    let inferenceSession;
    const connection = new signalR.HubConnectionBuilder().withUrl("/SessionConnectionHub").build();

    const scrollContainer = $("#scroll-container");
    const outputContainer = $("#output-container");
    const chatInput = $("#input");

    const onLoaded = () => {
        onLlama(`${modelName} loaded`);
        loaderHide();
        enableControls();
        $(".input-control-wrapper").show();
    }

    const onStatus = (connection, status) => {
        if (status == Enums.SessionConnectionStatus.Disconnected) {
            onError("Socket not connected")
        }
        else if (status == Enums.SessionConnectionStatus.Connected) {
            onLlama(`Loading ${modelName}`);
            loadModel(modelName);
        }
        else if (status == Enums.SessionConnectionStatus.Loaded) {
            onLoaded();
        }
    }

    const onLlama = (error) => {
        enableControls();
        outputContainer.append(Mustache.render(outputLLamaTemplate, { text: error, date: getDateTime() }));
    }

    const onError = (error) => {
        enableControls();
        outputContainer.append(Mustache.render(outputErrorTemplate, { text: error, date: getDateTime() }));
    }

    const onInfo = (message) => {
        outputContainer.append(Mustache.render(outputInfoTemplate, { text: message, date: getDateTime() }));
    }

    let responseContent;
    let responseContainer;
    let responseFirstToken;
    var converter = new showdown.Converter();
    var entireResponse = '';

    const onResponse = (response) => {
        if (!response)
            return;

        if (response.tokenType == Enums.TokenType.Begin) {
            let uniqueId = randomString();
            outputContainer.append(Mustache.render(outputBotTemplate, { uniqueId: uniqueId, modelName: modelName, ...response }));
            responseContainer = $(`#${uniqueId}`);
            responseContent = responseContainer.find(".content");
            responseFirstToken = true;
            scrollToBottom(true);
            return;
        }

        if (response.tokenType == Enums.TokenType.End || response.tokenType == Enums.TokenType.Cancel) {
            enableControls();
            responseContainer.find(".signature").append(Mustache.render(signatureTemplate, response));
            scrollToBottom();
            entireResponse = '';
        }
        else {
            if (responseFirstToken) {
                responseContent.empty();
                responseFirstToken = false;
                responseContainer.find(".date").append(getDateTime());
                var newContent = response.content;
                responseContent.append(newContent);
                entireResponse += newContent;
            }
            else {
                var newContent = response.content;
                entireResponse += newContent;
                var html = converter.makeHtml(entireResponse);
                responseContent.html(html);
            }
            scrollToBottom();
        }
    }

    const sendPrompt = async () => {
        const text = chatInput.text();
        if (text) {
            chatInput.text('');
            disableControls();
            outputContainer.append(Mustache.render(outputUserTemplate, { text: text, date: getDateTime() }));
            inferenceSession = await connection
                .stream("SendPrompt", text, serializeFormToJson())
                .subscribe({
                    next: onResponse,
                    complete: onResponse,
                    error: onError,
                });
            scrollToBottom(true);
        }
    }

    const cancelPrompt = async () => {
        if (inferenceSession)
            inferenceSession.dispose();
    }

    const loadModel = async () => {
        const sessionParams = serializeFormToJson();
        sessionParams.Model = modelName;

        loaderShow();
        disableControls();
        disablePromptControls();
        $(".load").attr("disabled", "disabled");

        // TODO: Split parameters sets
        await connection.invoke('LoadModel', sessionParams, sessionParams);
    }

    const unloadModel = async () => {
        await cancelPrompt();
        disableControls();
        enablePromptControls();
        $(".load").removeAttr("disabled");
    }

    const serializeFormToJson = () => {
        const formDataJson = {};
        const formData = new FormData(document.getElementsByClassName("session-parameters")[0]);
        formData.forEach((value, key) => {

            if (key.includes("."))
                key = key.split(".")[1];

            // Convert number strings to numbers
            if (!isNaN(value) && value.trim() !== "") {
                formDataJson[key] = parseFloat(value);
            }
            // Convert boolean strings to booleans
            else if (value === "true" || value === "false") {
                formDataJson[key] = (value === "true");
            }
            else {
                formDataJson[key] = value;
            }
        });
        return formDataJson;
    }

    const enableControls = () => {
        $("#input").removeAttr("disabled");
    }

    const disableControls = () => {
        $("#input").attr("contenteditable", "");
    }

    const enablePromptControls = () => {
        $(".load").show();
        $(".unload").hide();
        $(".input-control-wrapper").hide();
        $(".prompt-control").removeAttr("disabled");
        activatePromptTab();
    }

    const disablePromptControls = () => {
        $(".prompt-control").attr("disabled", "disabled");
        activateParamsTab();
    }

    const clearOutput = () => {
        outputContainer.empty();
    }

    const updatePrompt = () => {
        const customPrompt = $("#PromptText");
        const selection = $("option:selected", "#Prompt");
        const selectedValue = selection.data("prompt");
        customPrompt.text(selectedValue);
    }

    const getDateTime = () => {
        const dateTime = new Date();
        return dateTime.toLocaleString();
    }

    const randomString = () => {
        return Math.random().toString(36).slice(2);
    }

    const scrollToBottom = (force) => {
        const scrollTop = scrollContainer.scrollTop();
        const scrollHeight = scrollContainer[0].scrollHeight;
        if (force) {
            scrollContainer.scrollTop(scrollContainer[0].scrollHeight);
            return;
        }
        if (scrollTop + 70 >= scrollHeight - scrollContainer.innerHeight()) {
            scrollContainer.scrollTop(scrollContainer[0].scrollHeight)
        }
    }

    const activatePromptTab = () => {
        $("#nav-prompt-tab").trigger("click");
    }

    const activateParamsTab = () => {
        $("#nav-params-tab").trigger("click");
    }

    const loaderShow = () => {
        $(".spinner").show();
    }

    const loaderHide = () => {
        $(".spinner").hide();
    }

    // Map UI functions
    $(".load").on("click", loadModel);
    $(".unload").on("click", unloadModel);
    $("#send").on("click", sendPrompt);
    $("#clear").on("click", clearOutput);
    $("#cancel").on("click", cancelPrompt);
    $("#Prompt").on("change", updatePrompt);
    chatInput.on('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendPrompt();
        }
    });
    $(".slider").on("input", function (e) {
        const slider = $(this);
        slider.next().text(slider.val());
    }).trigger("input");

    // Map signalr functions
    connection.on("OnStatus", onStatus);
    connection.on("OnError", onError);
    connection.on("OnResponse", onResponse);
    connection.start();
}