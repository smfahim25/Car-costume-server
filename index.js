const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//middleware
app.use(express.json())
app.use(cors())

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCSESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded //je data ta token er moddhe ase sheta amra  decoded er moddhe pabo
        next()
    });
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ortxu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('bicycles_manufacturer').collection('parts');
        const orderCollection = client.db('bicycles_manufacturer').collection('orders');
        const reviewCollection = client.db('bicycles_manufacturer').collection('reviews');
        const profileCollection = client.db('bicycles_manufacturer').collection('profile');
        const userCollection = client.db('bicycles_manufacturer').collection('user');
        const paymentCollection = client.db('bicycles_manufacturer').collection('payments');

        app.get('/part', async (req, res) => {
            const query = {}
            const cursor = partsCollection.find(query)
            const parts = await cursor.toArray()
            res.send(parts)
        })
        //single id data load
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const part = await partsCollection.findOne(query)
            res.send(part)
        })
        app.get('/myorder', verifyJwt, async (req, res) => {
            const email = req.query.customerEmail
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { customerEmail: email }
                const cursor = orderCollection.find(query)
                const parts = await cursor.toArray()
                res.send(parts)
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        })

        app.get('/myorder/:id', verifyJwt, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(query)
            res.send(order)
        })
        //order place api:
        app.post('/part', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })
        //update api:
        app.put('/part/:id', async (req, res) => {
            const id = req.params.id
            const updatePart = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedoc = {
                $set: {
                    AvailableQuantity: updatePart.AvailableQuantity
                }
            }
            const result = await partsCollection.updateOne(filter, updatedoc, options)
            res.send(result)
        })
        //review post  backend api:
        app.post('/addreview', async (req, res) => {
            const newReview = req.body
            const result = await reviewCollection.insertOne(newReview)
            res.send(result)
        })
        //review  data load api:
        app.get('/review', async (req, res) => {
            const query = {}
            const cursor = reviewCollection.find(query)
            const reviews = await cursor.toArray()
            res.send(reviews)
        })
        //profile post backend  api:
        app.post('/myprofile', async (req, res) => {
            const newProfile = req.body
            const result = await profileCollection.insertOne(newProfile)
            res.send(result)
        })
        // app.put('/myprofile', async (req, res) => {
        //     const updateProfile = req.body
        //     const options = { upsert: true }
        //     const updatedoc = {
        //         $set: {
        //             profile: updateProfile
        //         }
        //     }
        //     const result = await profileCollection.updateOne(updatedoc, options)
        //     res.send(result)

        // })
        //update api for myProfile
        app.put('/myprofile/:email', async (req, res) => {
            const email = req.params.email
            const info = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedoc = {
                //set er moddhe user related info thakbe.ei info amra body theke nibo
                $set: info,
            };
            const result = await profileCollection.updateOne(filter, updatedoc, options)
            res.send(result)


        })

        //user load api:
        app.get('/user', verifyJwt, async (req, res) => {

            const query = {}
            const cursor = userCollection.find(query)
            const users = await cursor.toArray()
            res.send(users)
        })
        app.get('/order', verifyJwt, async (req, res) => {

            const query = {}
            const cursor = orderCollection.find(query)
            const orders = await cursor.toArray()
            res.send(orders)
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }//email diye amra user take khujbo
            const options = { upsert: true }
            const updatedoc = {
                //set er moddhe user related info thakbe.ei info amra body theke nibo
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedoc, options)
            var token = jwt.sign({ email: email }, process.env.ACCSESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token })
        })
        //make admin backend api:
        app.put('/user/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updatedoc = {
                    //set er moddhe user related info thakbe.ei info amra body theke nibo
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updatedoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }
        })
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        //admin post api:
        app.post('/adminpost', async (req, res) => {
            const newPart = req.body
            const result = await partsCollection.insertOne(newPart)
            res.send(result)
        })
        //delete product api:
        app.delete('/part/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId }
            const result = await partsCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })
        //stripe backend api:
        app.post('/create-payment-intent', verifyJwt, async (req, res) => {
            const part = req.body
            const price = part.pricePerUnit * part.orderQuantity
            console.log(price);
            const amount = price * 100

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })
        //transiction id store in database api:
        app.patch('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = { _id: ObjectId(id) }
            const updatedoc = {
                $set: {
                    paid: true,
                    transictionId: payment.transictionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updatedoc)
            res.send(updateOrder)
        })

    }
    finally {

    }

}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello from car manufacturer')
})

app.listen(port, () => {
    console.log(`car manufacturer app listening on port ${port}`)
})