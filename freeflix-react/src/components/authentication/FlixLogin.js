import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import './FlixLogin.css';

const FlixLogin = ({ show, onHide }) => {
    const [isSignIn, setIsSignIn] = useState(true);

    const handleClose = () => {
        setIsSignIn(true); // Reset to sign in when closing
        onHide();
    };

    const toggleForm = () => {
        setIsSignIn(!isSignIn);
    };

    return (
        <Modal 
            show={show} 
            onHide={handleClose}
            centered
            className="flix-login-modal"
        >
            <Modal.Header closeButton className="flix-modal-header border-0">
                <Modal.Title className="w-100 text-center">
                    {isSignIn ? 'Sign In' : 'Create Account'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="flix-modal-body">
                {isSignIn ? (
                    <SignInForm onSuccess={handleClose} />
                ) : (
                    <SignUpForm onSuccess={handleClose} />
                )}
                
                <div className="text-center mt-4">
                    <span className="text-muted">
                        {isSignIn ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button 
                        className="btn-link text-flix border-0 bg-transparent p-0"
                        onClick={toggleForm}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isSignIn ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default FlixLogin;
