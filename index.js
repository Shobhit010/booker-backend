const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const multer = require('multer');
const fs = require('fs');
const Booking = require('./models/Booking.js');
// Added new line
const PORT = process.env.PORT || 4000;


require('dotenv').config();

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'fvnderoseininiwsn43wnrfw3';

app.use(express.json());

app.use(cookieParser());

app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("✅ MongoDB connected successfully");
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
    });

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if(err) throw err;
            resolve(userData);
        });
    })
    
}

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        });
        res.json(userDoc);
    } catch (e) {
        if (e.code === 11000) {
            res.status(422).json({ message: 'Email already exists. Please use a different email or login.' });
        } else {
            console.error(e);
            res.status(500).json({ message: 'Registration failed due to server error.' });
        }
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email });
    if(userDoc){
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if(passOk) {
            jwt.sign({
                email:userDoc.email, 
                id:userDoc._id, 
                name:userDoc.name
            }, jwtSecret, {}, (err,token) => {
                if(err) throw err;
                res.cookie('token', token).json(userDoc);
            });
        } else {
            res.status(422).json('Password is wrong');
        }
    } else {    
        res.json('not found');
    }
});

app.get('/profile', (req, res) => {
    const {token} = req.cookies;
    if(token) {
        jwt.verify(token, jwtSecret, {}, async(err, userData) => {
            if(err) throw err;
            const{name,email,_id} = await User.findById(userData.id);
            res.json({name,email,_id});
        });
    } else {
        res.json(null);
    }
});

app.post('/logout', (req, res) => {
    res.cookie('token', '').json(true);
});

app.post('/upload-by-link', async (req, res) => {
    const { link } = req.body; 
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName, 
    });
    res.json(newName);
});

const photosMiddleware = multer({ dest: 'uploads/' });
app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const {path,originalname} = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
        uploadedFiles.push(newPath.replace(/uploads[\\/]/, ''));
    }
    res.json(uploadedFiles);
    // const upload = multer({dest: 'uploads/'}).array('photos', 100);
});

app.post('/places', (req, res) => {
    const {token} = req.cookies;
    const {
        title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async(err, userData) => {
        if(err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos: addedPhotos, description, 
            perks, extraInfo, checkIn, checkOut, maxGuests, price,
        });
        res.json(placeDoc);
    });
});

app.get('/user-places', (req, res) => {
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async(err, userData) => {
        if(err) throw err;
        const {id} = userData;
        res.json( await Place.find({owner: id}));
    });
});

app.get('/places/:id', async (req, res) => {
    const {id} = req.params;    
    res.json(await Place.findById(id));
});

app.put('/places', async (req, res) => {
    const {token} = req.cookies;
    const { id, title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price} = req.body; 
    jwt.verify(token, jwtSecret, {}, async(err, userData) => {
        if(err) throw err;
        const placeDoc = await Place.findById(id);
        if(userData.id === placeDoc.owner.toString()){
            placeDoc.set({
                title, address, photos: addedPhotos, description, 
                perks, extraInfo, checkIn, checkOut, maxGuests, price,
            });
            await placeDoc.save();
            res.json('ok');
        }
    });
});

app.get('/places', async (req, res) => {
    res.json(await Place.find());  
});

app.post('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req);
    const {
        place,checkIn,checkOut,
        numberOfGuests,name,phone,price,
    } = req.body;
    Booking.create({
        place,checkIn,checkOut,
        numberOfGuests,name,phone,price,
        user:userData.id,
    }).then((doc) => {
        res.json(doc);
    }).catch((err) => {
        throw err;
    })

});

app.get('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place'));
});


app.get("/", (req, res) => {
    res.send("API is live!");
});
  
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
  


// const express = require('express');
// const cors = require('cors');
// const { default: mongoose } = require('mongoose');
// require('dotenv').config();
// const app = express();


// app.use(express.json());

// app.use(cors({
//     credentials: true,
//     origin: 'http://localhost:5173',
// }));

// console.log
// mongoose.connect('process.env.MONGO_URL');

// app.get('/test', (req, res) => {
//   res.json('test ok');
// });
// // ZQEs7H8qqI5h7fDW
// app.post('/register', (req, res) => {
//   const { name, email, password } = req.body;
//   res.json({name,email,password});
// });

// app.listen(4000);

// mongodb+srv://shobhitpoddar410:ZQEs7H8qqI5h7fDW@cluster0.7ozfzf4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0



// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://shobhitpoddar410:ZQEs7H8qqI5h7fDW@cluster0.7ozfzf4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);
