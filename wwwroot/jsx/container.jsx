const DOCS_PER_PAGE			= 5,
	  PAGES_PER_FETCH		= 2,
	  MIN_DOCS_PER_FETCH	= DOCS_PER_PAGE * PAGES_PER_FETCH,

	  CLIENT_HEIGHT_BUFFER	= 100,
	  PAGE_DELAY			= 500,
	  ADD_ONSCROLL_DELAY	= 500,

	  MAX_BUTTONS			= 10;

const Pagination = ReactBootstrap.Pagination,
	  ListGroupItem = ReactBootstrap.ListGroupItem;

const Container = React.createClass({
  scrollTimeout:undefined,

  getInitialState() {
	return {
	  count:0,
	  numbPages:0,
	  activePage:0,
	  highestOddIdx:0,
	  elements:[]
	};
  },

  // LIFECYCLE METHODS

  //fake the initial db hit
  componentDidMount(){
	const firstTen = Array.from({length:MIN_DOCS_PER_FETCH},(v,k)=>k);
	this.addNewResults({documents:firstTen,count:2000,activePage:1});
  },

  //end here if scrolling
  componentDidUpdate(prevProps,prevState){
	const c = this.getDocsContainer();
	//if coming from initial load OR clicking nav page button
	if(!prevState.elements.length || !c.onscroll)
	  this.scrollToPosition();
  },

  // UTILITY METHODS

  addNewResults(results){
	const numbPages = Math.ceil(results.count / DOCS_PER_PAGE),
		  newElements = this.buildElements(results.documents),
		  allElements = this.state.elements.concat(newElements),
		  newState = {count:results.count,numbPages,elements:allElements},
		  oddIdxDiff = newElements.length / MIN_DOCS_PER_FETCH;

	if(results.activePage)
	  newState.activePage = results.activePage;

	if(this.state.elements.length)
	  newState.highestOddIdx = (this.state.highestOddIdx + oddIdxDiff);

	this.setState(newState);
  },

  buildElements(docs){
	const elements = [];
	docs.map((v,k) => elements.push(
	  <ListGroupItem key={v} header={`Item ${v}`} href="#">{`Item ${v}`}</ListGroupItem>
	));
	return elements;
  },

  getDocsContainer(){
	return document.getElementById('docsContainer');
  },

  //only if nav button clicked
  scrollToPosition(){
	const c = this.getDocsContainer(),
		  pixelsPerPage = this.pixelsPerPg(c.scrollHeight),
		  topOfPage = pixelsPerPage * (this.state.activePage - 1);

	if(topOfPage!=c.scrollTop)
	  c.scrollTop = topOfPage;

	//add the onscroll handler after short delay
	setTimeout(()=>(c.onscroll=this.setScrollTimeout),ADD_ONSCROLL_DELAY);
  },

  pixelsPerPg(scrollHeight){
	const pixelsPerDoc = (scrollHeight / this.state.elements.length);
	return (pixelsPerDoc * DOCS_PER_PAGE);
  },

  //end here if nav button clicked
  //start here if scrolling
  setScrollTimeout(){
	//wait for timeout before adding handler again
	if(!this.scrollTimeout){
	  let that = this;
	  this.scrollTimeout = setTimeout(()=>{
		that.scrollTimeout = undefined;
		that.refetchOrSetActivePage();
	  },PAGE_DELAY);
	}
  },

  //only if scrolling
  refetchOrSetActivePage(){
	const elemLength = this.state.elements.length,
		  c = this.getDocsContainer(),
		  pixelsUntilDone = (c.scrollHeight - c.scrollTop);

	if(elemLength<this.state.count){
	  const viewPortAndBuffer = (c.clientHeight + CLIENT_HEIGHT_BUFFER),
			shouldRefetch = (pixelsUntilDone < viewPortAndBuffer);

	  if(shouldRefetch){
		//fake next db hit
		//load minimum because this is triggered by scrolling
		const nextTen = Array.from({length:MIN_DOCS_PER_FETCH},(v,k)=>(elemLength+k));
		this.addNewResults({documents:nextTen,count:2000});
	  }
	  else
		this.setActivePage(pixelsUntilDone);
	}
	else
	  this.setActivePage(pixelsUntilDone);
  },

  //only if scrolling
  //setting the active page nav button is separate from loading new results
  setActivePage(pixelsUntilDone){
	const c = this.getDocsContainer(),
		  pixelsPerPage = this.pixelsPerPg(c.scrollHeight),

		  done = (pixelsUntilDone==c.clientHeight),
		  onLastPage = (this.state.activePage==this.state.numbPages),

		  prevPg = (this.state.activePage - 1),
		  nxPg = (this.state.activePage + 1),

		  endPixelForPrevPg = (pixelsPerPage * prevPg),
		  beginPixelForNxPg = (pixelsPerPage * this.state.activePage),

		  shouldGoBack = (c.scrollTop < (endPixelForPrevPg - CLIENT_HEIGHT_BUFFER)),
		  shouldGoForward = (c.scrollTop > (beginPixelForNxPg - CLIENT_HEIGHT_BUFFER)),

		  //if going forward, how many pages?
		  //this logic is neccesary because of variable scroll speed
		  nonZeroScrollTop = c.scrollTop?c.scrollTop:1,
		  newCurrPgNoBuffer = Math.ceil(nonZeroScrollTop / pixelsPerPage),
		  endPixelForNewCurrPgNoBuffer = (pixelsPerPage * newCurrPgNoBuffer),
		  addPageForBuffer = (CLIENT_HEIGHT_BUFFER > (endPixelForNewCurrPgNoBuffer - c.scrollTop)),

		  newCurrPg = addPageForBuffer?(newCurrPgNoBuffer+1):newCurrPgNoBuffer,
		  newNxPg = (newCurrPg + 1),

		  beginPixelForNewNxPg = (pixelsPerPage * newCurrPg),
		  shouldGoForwardToNewNxPg = (c.scrollTop > (beginPixelForNewNxPg - CLIENT_HEIGHT_BUFFER));

	if(shouldGoBack)
	  this.setState({activePage:newCurrPg});
	else if(done && !onLastPage)
	  this.setState({activePage:this.state.numbPages});
	else if(shouldGoForward)
	  this.setState({activePage:shouldGoForwardToNewNxPg?newNxPg:newCurrPg});
  },

  //start here if nav button clicked
  pageFromNav(newPage){
	if(typeof newPage =='number'){
	  const c = this.getDocsContainer(),
			newOddIdx = this.getOddIdx(newPage);
	  c.onscroll = undefined;

	  //if loading more results
	  if(newOddIdx>this.state.highestOddIdx){
		const elemLength = this.state.elements.length,
			  newLimit = (newOddIdx - this.state.highestOddIdx) * MIN_DOCS_PER_FETCH;

		//fake next db hit
		//load an amount based on new page
		const nextResults = Array.from({length:newLimit},(v,k)=>(elemLength+k));
		this.addNewResults({documents:nextResults,count:2000,activePage:newPage});
	  }
	  else
		this.setState({activePage:newPage});
	}
  },

  //odd index is the zero-indexed count of odd numbers up to
  //the current page if it's odd or the previous page if the
  //current page is even (ex. page = 8, odd idx = 3)
  getOddIdx(newPage){
	const oddPage = (newPage%2)?newPage:(newPage-1);
	let newOddIdx = 0;
	for(let i=1;i<oddPage;i+=2)
	  newOddIdx++;
	return newOddIdx;
  },

  render(){
	return (
	  <div id="contentContainer">
		<Pagination
		  prev
		  next
		  first
		  last
		  ellipsis
		  boundaryLinks
		  items={this.state.numbPages}
		  maxButtons={MAX_BUTTONS}
		  activePage={this.state.activePage}
		  onSelect={this.pageFromNav} />
		<div id="docsContainer">
		  {this.state.elements}
		</div>
	  </div>
	);
  }
});

ReactDOM.render(<Container />,document.body);
