
const faultReportForm = document.getElementById("faultReportForm");

const machineCodeInput = document.getElementById("machineCode");

const descriptionInput = document.getElementById("description");

const formMessage = document.getElementById("formMessage");

const submitButton = document.getElementById("submitButton");

const scanButton = document.getElementById("scanButton");

const scanStatus = document.getElementById("scanStatus");

const picturesInput = document.getElementById("pictures");

const audioInput = document.getElementById("audio");

const videoInput = document.getElementById("video");


// 2. DISPLAY FEEDBACK MESSAGES

function displayMessage(message) {
    formMessage.textContent = message;
}


// 3. QR SCANNER BUTTON

scanButton.addEventListener("click", function() {

    scanStatus.textContent =
        "QR scanning is not connected yet. Please enter the machine code manually.";

});


// 4. FORM SUBMISSION

faultReportForm.addEventListener("submit", function(event) {

    // Prevent the page from refreshing
    event.preventDefault();

    // Clear previous messages
    displayMessage("");

    // Get the user's input
    const machineCode = machineCodeInput.value.trim();

    const description = descriptionInput.value.trim();


    // 5. VALIDATE MACHINE CODE

    if (machineCode === "") {

        displayMessage("Please enter the machine code.");

        machineCodeInput.focus();

        return;
    }


    // 6. VALIDATE FAULT DESCRIPTION

    if (description === "") {

        displayMessage("Please describe the machine fault.");

        descriptionInput.focus();

        return;
    }


    // 7. COLLECT REPORT INFORMATION

    const reportData = new FormData();

    reportData.append("machineCode", machineCode);

    reportData.append("description", description);


    // 8. COLLECT PICTURE ATTACHMENTS

    for (const picture of picturesInput.files) {

        reportData.append("pictures", picture);

    }


    // 9. COLLECT AUDIO ATTACHMENT

    if (audioInput.files.length > 0) {

        reportData.append("audio", audioInput.files[0]);

    }


    // 10. COLLECT VIDEO ATTACHMENT

    if (videoInput.files.length > 0) {

        reportData.append("video", videoInput.files[0]);

    }


    // 11. DISPLAY COLLECTED INFORMATION IN CONSOLE

    console.log("Machine Code:", machineCode);

    console.log("Fault Description:", description);

    console.log("Pictures:", picturesInput.files);

    console.log("Audio:", audioInput.files);

    console.log("Video:", videoInput.files);

    console.log("Report information collected:", reportData);


    // 12. DISPLAY CONFIRMATION MESSAGE

    displayMessage(
        "Validation successful! Your report information has been collected. It has not been saved because the backend is not connected yet."
    );

});

