var newMaxVal = 255;

var errorEl = document.getElementById("error");
var errorContentEl = document.getElementById("error-content");

// error(msg) - Displays `msg` in a red-colored overlay at the top of the page
//  and throws `msg`.
var error = function(msg) {
  errorEl.style.display = "block";
  errorEl.style.backgroundColor = "red";
  errorContentEl.textContent = msg;
  throw msg;
};

// success(msg) - Displays `msg` in a green-colored overlay at the top of the
//  page.
var success = function(msg) {
  errorEl.style.display = "block";
  errorEl.style.backgroundColor = "#00DD44";
  errorContentEl.textContent = msg;
};

// hideError() - Hides the success/error overlay at the top of the page.
var hideError = function() {
  errorEl.style.display = "none";
};

// assert(condition, msg) - Calls error(msg) iff condition is not truthy.
var assert = function(condition, msg) {
  if (!condition) {
    error(msg);
  }
};

// toString(charCodeArray) - Takes an array of numbers and converts the array
//  to a string with each character in the string corresponding to the
//  character with the char code in the corresponding part of the array.
var toString = function(charCodeArray) {
  return charCodeArray.map(function(code) {
    return String.fromCharCode(code);
  }).join("");
};

// toBinary(str) - Performs the reverse of toString - Converts the string to
//  an array of its char codes.
var toBinary = function(str) {
  return str.toString().split("").map(function(c) {
    return c.charCodeAt(0);
  });
};
var binarySpace = toBinary(" ")[0];
var binaryNewLine = toBinary("\n")[0];

var whitespace = Array(256).fill(false);
whitespace[9] = true;
whitespace[10] = true;
whitespace[11] = true;
whitespace[12] = true;
whitespace[32] = true;
// isWhitespace(charCode) - Returns true iff charCode corresponds to a standard
//  ASCII whitespace value (i.e. one for which the C function isspace() would
//  return true).
var isWhitespace = function(charCode) {
  return whitespace[charCode];
};

// convertP6toP3(p6File, callback) - Reads the contents of p6File, producing
//  an error if the file format is invalid or unexpected. Once the file is
//  parsed, calls `callback` with the new P3-formatted file.
var convertP6toP3 = function(p6File, callback) {
  var fileReader = new FileReader();
  fileReader.addEventListener("load", function(e) {
    var buffer = e.target.result;
    var view = new Uint8Array(buffer);

    // First extract the magic number - "P6"
    var magicNumber = toString([view[0], view[1]]);
    assert(magicNumber === "P6",
      "This program can only convert images from the P6 format (your format: " +
      magicNumber + ")");

    // Then, extract whitespace.
    var i = 2;
    while (isWhitespace(view[i])) {
      ++i;
    }

    // Then, extract the width.
    var widthChars = [];
    while (!isWhitespace(view[i])) {
      widthChars.push(view[i]);
      ++i;
    }
    assert(i < view.length, "File is too short: expected more data");
    var width = parseInt(toString(widthChars), 10);
    assert(isFinite(width) && width > 0,
      "Invalid width specified in PPM file");

    // Then, extract whitespace.
    while (isWhitespace(view[i])) {
      ++i;
    }

    // Then, extract the height.
    var heightChars = [];
    while (!isWhitespace(view[i])) {
      heightChars.push(view[i]);
      ++i;
    }
    assert(i < view.length, "File is too short: expected more data");
    var height = parseInt(toString(heightChars), 10);
    assert(isFinite(height) && height > 0,
      "Invalid height specified in PPM file");

    // Then, extract whitespace.
    while (isWhitespace(view[i])) {
      ++i;
    }

    // Then, extract the maximum color value.
    var maxValChars = [];
    while (!isWhitespace(view[i])) {
      maxValChars.push(view[i]);
      ++i;
    }
    ++i; // Skip the only whitespace character
    assert(i < view.length, "File is too short: expected more data");
    var maxVal = parseInt(toString(maxValChars), 10);
    assert(0 < maxVal && maxVal < 65536,
      "Maximum color value is not within the range (0, 65536)");
    var wideValues = maxVal >= 256;

    // Create the new P3 file with the same width and height and a maximum color
    //  value of 255.
    var newHeader = toBinary("P3\n" + width + " " + height + "\n" + newMaxVal +
      "\n");
    var newImage = new Uint8Array(
      newHeader.length + (width * 3 * 4 + 1) * height
    );

    // Copy the header into the file.
    var j = 0;
    while (j < newHeader.length) {
      newImage[j] = newHeader[j];
      ++j;
    }

    // Convert the binary P6 data into ASCII P3 data and append it to the file.
    var pixelNumber = 0;
    var value;
    var binary;
    while (i < view.length && j < newImage.length) {
      binary = wideValues ? (view[i] * 256 + view[i]) : view[i];
      value = toBinary(Math.round(view[i] / maxVal * newMaxVal));
      for (var k = 0; k < 4; ++k) {
        if (k < value.length) {
          newImage[j] = value[k];
        }
        else {
          newImage[j] = binarySpace;
        }
        ++j;
      }
      ++pixelNumber;
      if ((pixelNumber / 3) % width === 0) {
        newImage[j] = binaryNewLine;
        ++j;
      }
      i += wideValues ? 2 : 1;
    }
    assert(i == view.length && j == newImage.length,
      "Actual number of pixels did not match specified width and height");

    // Call the callback with the new file.
    callback(new File([newImage.buffer], p6File.name, {
      type: "image/x-portable-pixmap"
    }));
    success("Conversion successful!");
  });
  fileReader.readAsArrayBuffer(p6File);
};

// download(file, name) - Automatically gives the user a prompt to download
//  a file `file` with name `name`.
var download = function(file, name) {
  if (name === undefined) {
    name = file.name;
  }
  var link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(file));
  link.setAttribute("download", name);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// convertAndDownload(p6File) - Converts p6File to the P3 format and downloads
//  it.
var convertAndDownload = function(p6File) {
  convertP6toP3(p6File, download);
};

// handleFiles(fileList) - Converts and downloads each file in `fileList`.
//  Produces an error if there are no files to handle.
var handleFiles = function(fileList) {
  assert(fileList.length > 0, "Please select a file to convert");
  for (var i = 0; i < fileList.length; ++i) {
    convertAndDownload(fileList[i]);
  }
};

// When the "Convert" button is pressed, convert and download all selected
//  files.
var fileInputEl = document.getElementById("file-input");
var convertButtonEl = document.getElementById("start-conversion");
convertButtonEl.addEventListener("click", function() {
  handleFiles(fileInputEl.files);
});

// When the "X" button is pressed, hide the success/error overlay at the top of
//  the page.
var hideErrorButtonEl = document.getElementById("hide-error");
hideErrorButtonEl.addEventListener("click", hideError);
