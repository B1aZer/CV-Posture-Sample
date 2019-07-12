import React from 'react';
import * as posenet from '@tensorflow-models/posenet';
import { toPairs } from 'lodash';
import importAll from 'import-all.macro';
import {
 drawBoundingBox,
 drawKeypoints,
 drawSkeleton,
 drawSegment,
 drawPoint,
 drawPoses,
} from './Utils';

const videoFiles = toPairs(importAll.sync('../videos/**/*.mp4'));

class Main extends React.Component {

  constructor(props) {
    super(props);
    this.handleCounterChange = this.handleCounterChange.bind(this);
  }

  state = {
    counter: 0
  }

  handleCounterChange(i) {
    this.setState((state, props) => ({
      counter: i
    }));
  }

  render() {
    return (
      <div>
        <h1>Hello {this.state.counter}</h1>
        <VideoSelector handleCounter={this.handleCounterChange} />
      </div>
    )
  }

}

class VideoSelector extends React.PureComponent {

  state = {
    src1: 'videos/curry_cropped.mp4',
    src2: 'videos/curry_cropped.mp4',
  };

  render() {
    return (
      <div>
        <div className="row">
          <div className="container">
            <video id="video" width="400" height="400" muted controls style={{display: 'none'}}>
             <source src={this.state.src1} type="video/mp4"/>
            </video>
            <canvas id="output" width="400" height="400"/>
            <div>
            <select
                defaultValue={this.state.src1}
                onChange={e => this.setState({ src1: e.target.value })}
                >
                {
                  videoFiles.map(([filename, path]) => (
                  <option key={path} value={path}>
                    {filename}
                  </option>
                  ))
                }
            </select>
            </div>
          </div>
          <div>
            <button onClick={this.doCompare}>Compare</button>
          </div>
          <div className="container">
            <video id="video2" width="400" height="400" muted controls style={{display: 'none'}}>
             <source src={this.state.src2} type="video/mp4"/>
            </video>
            <canvas id="output2" width="400" height="400"/>
            <div>
            <select
                defaultValue={this.state.src2}
                onChange={e => this.setState({ src2: e.target.value })}
                >
                {
                  videoFiles.map(([filename, path]) => (
                  <option key={path} value={path}>
                    {filename}
                  </option>
                  ))
                }
            </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  setup = async() => {
    const net = await posenet.load();
    //const net = await posenet.load({
      //architecture: 'ResNet50',
      //outputStride: 32,
      //inputResolution: 257,
      //quantBytes: 2
    //});
    //this.poseData = await loadPoseData();
    console.log('LOADED ALL POSES!!!');
    //this.setState({ loadedPoses: true });
    return net;
  };

  doCompare = () => {
    const video = this.getVideo('video2');
    const net = this.net;
    video.playbackRate = 0.2;
    video.onplaying = () => {
      this.getPoses(video, net);
    };
    video.play();
  }

  async componentDidUpdate(prevProps) {
    const video1 = this.getVideo('video');
    video1.load();
    const video2 = this.getVideo('video2');
    video2.load();
  }

  getVideo(id) {
    const video = document.getElementById(id);
    return video;
  }

  async componentDidMount() {
    this.net = await this.setup();
  }

  getPoses(video, net) {
    const canvas = document.getElementById('output2');
    const ctx = canvas.getContext('2d');
    let i = 0;

    let poseDetectionFrame = async () => {

      this.props.handleCounter(i);
      i += 1;

      let poses = [];
      const pose = await net.estimateSinglePose(video, {
        flipHorizontal: true,
        decodingMethod: 'single-person'
      });
      poses = poses.concat(pose);

      drawPoses(ctx, poses, video);

      if (!video.paused) {
        requestAnimationFrame(poseDetectionFrame);
      }

    }

    poseDetectionFrame();
  }

}

export default Main;
