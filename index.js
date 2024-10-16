require('dotenv').config();
const express = require('express');
const OAuthClient = require('intuit-oauth');
const session = require('express-session'); 
const axios = require('axios'); 

const app = express();
const port = process.env.PORT || 3000; // Use Heroku's port

app.use(session({ 
    secret: process.env.SESSION_SECRET || 'random_string', 
    resave: false, 
    saveUninitialized: true,
    cookie: {
        maxAge: null,
    }
}));

const oauthClient = new OAuthClient({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    environment: process.env.ENVIRONMENT,
    redirectUri: process.env.REDIRECT_URL
});

app.get('/auth', (req, res) => {
    const state = Math.random().toString(36).substring(2); 
    req.session.state = state; 

    const authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: state 
    });
    
    res.redirect(authUri);
});

app.get('/callback', async (req, res) => {
    const { query } = req;

    // Check the state parameter for CSRF protection
    if (query.state !== req.session.state) {
        return res.status(403).send('State does not match. Possible CSRF attack.');
    }

    try {
        // Exchange the authorization code for tokens
        const authResponse = await oauthClient.createToken(req.url);
        
        // Store tokens in the session
        const accessToken = authResponse.token.access_token; 
        const refreshToken = authResponse.token.refresh_token; 
        const realmId = authResponse.token.realmId; 

        req.session.token = {
            accessToken,
            refreshToken,
            realmId,
        };

        // Fetch invoices
        const invoicesResponse = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select * from Invoice&minorversion=40`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        const invoices = invoicesResponse.data.QueryResponse.Invoice;

        // Redirect to the PHP application with invoices as a JSON string
        // const phpRedirectUrl = `http://localhost/QuickBooks2/QuickBooks-API/invoices.php?invoices=${encodeURIComponent(JSON.stringify(invoices))}`; // Ensure this is your correct PHP URL
        // res.redirect(phpRedirectUrl);


        res.send(invoices);
    } catch (e) {
        console.error('Error exchanging code for token:', e);
        if (e.response) {
            console.error('Error response:', e.response);
            console.error('Error body:', e.response.body);
        }
        res.status(500).send('Error exchanging code for token');
    }
});


app.get('/invoices/:docNumber', async (req, res) => {
    if (!req.session.token) {
        return res.status(401).send('Unauthorized');
    }

    oauthClient.setToken(req.session.token); 

    try {
        const docNumber = req.params.docNumber; 
        const response = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${req.session.token.realmId}/query?query=select * from Invoice&minorversion=40`, {
            headers: {
                'Authorization': `Bearer ${req.session.token.accessToken}`, 
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        const invoices = response.data.QueryResponse.Invoice;
        const invoice = invoices.find(inv => inv.DocNumber === docNumber);

        if (!invoice) {
            return res.status(404).send('Invoice not found');
        }

        res.json(invoice); 
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).send('Error fetching invoices');
    }
});

app.get('/invoices', async (req, res) => {
    if (!req.session.token) {
        return res.status(401).send('Unauthorized');
    }

    oauthClient.setToken(req.session.token); 

    try {
        const response = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${req.session.token.realmId}/query?query=select * from Invoice&minorversion=40`, {
            headers: {
                'Authorization': `Bearer ${req.session.token.accessToken}`, 
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        req.session.invoices = response.data.QueryResponse.Invoice;

        res.json(req.session.invoices); 
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).send('Error fetching invoices');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/invoices');
        }
        res.clearCookie('connect.sid');
        res.redirect('/'); 
    });
});

app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
});  
