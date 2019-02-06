var newMaxVal = 255;

var error = function(msg) {
  alert("Error converting: " + msg);
  throw msg;
};

var assert = function(condition, msg) {
  if (!condition) {
    error(msg);
  }
};

var toString = function(charCodeArray) {
  return charCodeArray.map(function(code) {
    return String.fromCharCode(code);
  }).join("");
};

var toBinary = function(str) {
  return str.toString().split("").map(function(c) {
    return c.charCodeAt(0);
  });
};
var binarySpace = toBinary(" ")[0];
var binaryNewLine = toBinary("\n")[0];

var padRight = function(str, len) {
  str += "";
  if (str.length >= len) {
    return str;
  }
  return str + Array(len - str.length + 1).join(" ");
};

var whitespace = Array(256).fill(false);
whitespace[9] = true;
whitespace[10] = true;
whitespace[11] = true;
whitespace[12] = true;
whitespace[32] = true;
var isWhitespace = function(charCode) {
  return whitespace[charCode];
};

var convertP6toP3 = function(p6File, callback) {
  var fileReader = new FileReader();
  fileReader.addEventListener("load", function(e) {
    var buffer = e.target.result;
    var view = new Uint8Array(buffer);
    var magicNumber = toString([view[0], view[1]]);
    assert(magicNumber === "P6",
      "This program can only convert images from the P6 format");
    var i = 2;
    while (isWhitespace(view[i])) {
      ++i;
    }
    var widthChars = [];
    while (!isWhitespace(view[i])) {
      widthChars.push(view[i]);
      ++i;
    }
    assert(i < view.length, "File is too short: expected more data");
    var width = parseInt(toString(widthChars), 10);
    assert(isFinite(width) && width > 0,
      "Invalid width specified in PPM file");

    while (isWhitespace(view[i])) {
      ++i;
    }

    var heightChars = [];
    while (!isWhitespace(view[i])) {
      heightChars.push(view[i]);
      ++i;
    }
    assert(i < view.length, "File is too short: expected more data");
    var height = parseInt(toString(heightChars), 10);
    assert(isFinite(height) && height > 0,
      "Invalid height specified in PPM file");

    while (isWhitespace(view[i])) {
      ++i;
    }

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

    var newHeader = toBinary("P3\n" + width + " " + height + "\n" + newMaxVal +
      "\n");
    var newImage = new Uint8Array(
      newHeader.length + (width * 3 * 4 + 1) * height
    );
    var j = 0;
    while (j < newHeader.length) {
      newImage[j] = newHeader[j];
      ++j;
    }
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
    callback(new File([newImage.buffer], p6File.name));
  });
  fileReader.readAsArrayBuffer(p6File);
};

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

var convertAndDownload = function(p6File) {
  convertP6toP3(p6File, download);
};

var handleFiles = function() {
  var fileList = this.files;
  for (var i = 0; i < fileList.length; ++i) {
    convertAndDownload(fileList[i]);
  }
};

var fileInputEl = document.getElementById("file-input");
fileInputEl.addEventListener("change", handleFiles);
