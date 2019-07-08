import React from 'react';
import * as posenet from '@tensorflow-models/posenet';

class VideoSelector extends React.Component {
  state = {
  };

  render() {
    return (
      <h1>Hello</h1>
    );
  }

  setup = async () => {
    const net = await posenet.load();
    //this.poseData = await loadPoseData();
    console.log('LOADED ALL POSES!!!');
    //this.setState({ loadedPoses: true });
  };

  async componentDidMount() {
    await this.setup();
  }
}

export default VideoSelector;
