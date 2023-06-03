const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const mongoURI = require("./config/keys");

const app = express();
app.use("/public", express.static("public"));

// Middleware
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

let gfs;

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: file.originalname,
      bucketName: "uploads"
    };
  }
});

const upload = multer({ storage });

// Routes
// Previous code ...

app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Handle error
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    // Check for files
    if (!files || files.length === 0) {
      return res.render("index", { newList: false });
    }

    // Modify file information
    files = files.map(file => {
      const isImage =
        file.contentType === "image/jpeg" || file.contentType === "image/png";
      const isAudio =
        file.contentType === "audio/mpeg" || file.contentType === "audio/mp3";
      const isVideo =
        file.contentType === "video/mp4" || file.contentType === "video/avi";
      const isText = file.contentType === "text/plain";

      return {
        ...file,
        isImage,
        isAudio,
        isVideo, 
        isText
      }; 
    });

    res.render("index", { newList: files });
  });
});

// Remaining code ...


app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  });
});

app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.redirect("/");
  });
});

const port = process.env.PORT || 5555;

app.listen(port, () => console.log(`Server running on port ${port}`));
