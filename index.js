const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded //je data ta token er moddhe ase sheta amra  decoded er moddhe pabo
        next()
    });
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ortxu.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('car-manufacturer').collection('tools');
        const orderCollection = client.db('car-manufacturer').collection('orders');
        const reviewCollection = client.db('car-manufacturer').collection('reviews');
        const profileCollection = client.db('car-manufacturer').collection('profile');
        const userCollection = client.db('car-manufacturer').collection('user');
        const paymentCollection = client.db('car-manufacturer').collection('payments');

        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = toolsCollection.find(query)
            const tools = await cursor.toArray()
            res.send(tools)
        })
        //single id data load
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const tools = await toolsCollection.findOne(query)
            res.send(tools)
        })
        app.get('/myorder', verifyJwt, async (req, res) => {
            const email = req.query.customerEmail
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { customerEmail: email }
                const cursor = orderCollection.find(query)
                const tools = await cursor.toArray()
                res.send(tools)
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
        app.post('/tools', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })
        //update api:
        app.put('/tools/:id', async (req, res) => {
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


        // app.put('/user/:email', async (req, res) => {
        //     const email = req.params.email
        //     const user = req.body
        //     const filter = { email: email }//email diye amra user take khujbo
        //     const options = { upsert: true }
        //     const updatedoc = {
        //         //set er moddhe user related info thakbe.ei info amra body theke nibo
        //         $set: user,
        //     };
        //     const result = await userCollection.updateOne(filter, updatedoc, options)
        //     var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        //     res.send({ result, token })
        // })
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
            const result = await toolsCollection.insertOne(newPart)
            res.send(result)
        })
        //delete product api:
        app.delete('/part/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId }
            const result = await toolsCollection.deleteOne(query)
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
    res.send('Hello From cars costume own portal!');
})

app.listen(port, () => {
    console.log(`Cars costume App listening on port ${port}`)
});