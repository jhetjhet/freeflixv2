import React, { useState } from 'react';
import '../App.css';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FlixLogin from './authentication/FlixLogin';

function FlixNavbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const canCreateFlix = Boolean(user?.can_create_flix);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <Navbar variant="dark" fixed="top">
        <Navbar.Brand href="">
          <Link to="/">
            <img src="https://fontmeme.com/permalink/260319/9297dce8.png" id="logo" alt="FooFlix Logo"/>   
          </Link>
        </Navbar.Brand>
        <Nav className="ml-auto d-flex align-items-center">
          {isAuthenticated && canCreateFlix && (
            <Link to="/flix/create" className="mr-3">
              create
            </Link>
          )}
          
          {isAuthenticated ? (
            <>
              <span className="text-light mr-3">
                {user?.username}
              </span>
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button 
              variant="flix" 
              size="sm" 
              onClick={() => setShowLogin(true)}
            >
              Sign In
            </Button>
          )}
        </Nav>
      </Navbar>

      <FlixLogin show={showLogin} onHide={() => setShowLogin(false)} />
    </>
  );
}

export default FlixNavbar;