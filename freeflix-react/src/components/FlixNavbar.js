import React from 'react';
import '../App.css';
import { Navbar, Nav } from 'react-bootstrap';
import {Link} from 'react-router-dom';

function FlixNavbar() {
  return (
  	<Navbar variant="dark" fixed="top">
  		<Navbar.Brand href="">
  			<Link to="/">
          <img src="https://fontmeme.com/permalink/200803/bde55cd0c72282ba7171b3e11b85f475.png" id="logo" alt="FreeFlix Logo"/>   
        </Link>
  		</Navbar.Brand>
  		<Nav className="ml-auto">
        <Link to="/flix/create">
          create
        </Link>
  		</Nav>
  	</Navbar>
  );
}

export default FlixNavbar;