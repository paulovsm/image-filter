import express from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';
import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { NextFunction } from 'connect';
import * as EmailValidator from 'email-validator';
import { config } from './config/config';
import { sequelize, User } from './sequelize';

const router: Router = Router();

(async () => {

  await sequelize.addModels([User]);
  await sequelize.sync();

  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  app.use('/api/v0/', router)

  // Root URI call
  app.get( "/", async ( req, res ) => {
    res.send( "/api/v0/" );
  } );

  // @TODO1 IMPLEMENT A RESTFUL ENDPOINT
  // GET /filteredimage?image_url={{URL}}
  // endpoint to filter an image from a public url.
  // IT SHOULD
  //    1
  //    1. validate the image_url query
  //    2. call filterImageFromURL(image_url) to filter the image
  //    3. send the resulting file in the response
  //    4. deletes any files on the server on finish of the response
  // QUERY PARAMATERS
  //    image_url: URL of a publicly accessible image
  // RETURNS
  //   the filtered image file [!!TIP res.sendFile(filteredpath); might be useful]

  /**************************************************************************** */

  //! END @TODO1
  
  // Root Endpoint
  // Displays a simple message to the user
  router.get( "/", async ( req, res ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );

  router.get( "/filteredimage", requireAuth, async ( req, res ) => {
    const { image_url } = req.query;

    if (!image_url) {
      return res.status(400).send({ message: 'image_url parameter is required' });
    }

    console.log(image_url);

    const image_path:string = await filterImageFromURL(image_url);

    res.sendFile(image_path, (err) => { 
      if (err) { 
        return res.status(500).send({ message: 'Unable to send image' }); 
      } else { 
          console.log('Sent:', image_path);
          deleteLocalFiles([image_path]);
      } 
    });

  } );

  router.post('/login', async (req: Request, res: Response) => {
      const email = req.body.email;
      const password = req.body.password;
      // check email is valid
      if (!email || !EmailValidator.validate(email)) {
          return res.status(400).send({ auth: false, message: 'Email is required or malformed' });
      }

      // check email password valid
      if (!password) {
          return res.status(400).send({ auth: false, message: 'Password is required' });
      }

      const user = await User.findByPk(email);
      // check that user exists
      if(!user) {
          return res.status(401).send({ auth: false, message: 'Unauthorized' });
      }

      // check that the password matches
      const authValid = await comparePasswords(password, user.password_hash)

      if(!authValid) {
          return res.status(401).send({ auth: false, message: 'Unauthorized' });
      }

      // Generate JWT
      const jwt = generateJWT(user);

      res.status(200).send({ auth: true, token: jwt, user: user.short()});
  });

  async function comparePasswords(plainTextPassword: string, hash: string): Promise<boolean> {
      //@TODO Use Bcrypt to Compare your password to your Salted Hashed Password
      return bcrypt.compare(plainTextPassword, hash);
  }

  function generateJWT(user: User): string {
      return jwt.sign(user.email, config.jwt.secret);
  }

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.headers || !req.headers.authorization){
        return res.status(401).send({ message: 'No authorization headers.' });
    }
    
    const token_bearer = req.headers.authorization.split(' ');
    if(token_bearer.length != 2){
        return res.status(401).send({ message: 'Malformed token.' });
    }
    
    const token = token_bearer[1];

    return jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        return res.status(500).send({ auth: false, message: 'Failed to authenticate.' });
      }
      return next();
    });
}
  

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();