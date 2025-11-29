import React from 'react';
import './App.css';
import {
	BrowserRouter as Router, 
	Route, 
	Redirect, 
	Switch
} from 'react-router-dom';
import FlixNavbar from './components/FlixNavbar.js';
import FlixFooter from './components/FlixFooter.js';
import FlixCreate from './components/Pages/FlixCreate/FlixCreate.js';
import FlixFilter from './components/Pages/FlixList/FlixFilter.js';
import MovieDetail from './components/Pages/FlixDetail/MovieDetail.js';
import SeriesDetail from './components/Pages/FlixDetail/SeriesDetail.js';

function App() {
  return (
  	<React.Fragment>
  		<div className="main-background"></div>
	    <div className="main-container">
	    	<Router>
				<FlixNavbar />
				<div>
					<div className="inner-container d-flex flex-column w-100">
						<Switch>
							<Route exact path="/">
								<FlixFilter />
							</Route>
							<Route exact path="/flix/movie/:flix_id/:tmdb_id">
								<MovieDetail />
							</Route>
							<Route exact path="/flix/series/:flix_id/:tmdb_id">
								<SeriesDetail />
							</Route>
							<Route exact path="/flix/create">
								<FlixCreate />
							</Route>
						</Switch>
						<FlixFooter />
					</div>
				</div>
			</Router>
		</div>
  	</React.Fragment>
  );
}

export default App;