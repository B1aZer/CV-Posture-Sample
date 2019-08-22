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
 convertPoseToVector,
 buildVPTree,
 findMostSimilarMatch,
} from './Utils';

const videoFiles = toPairs(importAll.sync('../videos/**/*.mp4'));
const similarityMaxDistance = 0.2;

class Main extends React.Component {

  constructor(props) {
    super(props);
    this.handleCounterChange = this.handleCounterChange.bind(this);
    this.handleSimChange = this.handleSimChange.bind(this);
    this.getCounter = this.getCounter.bind(this);
  }

  state = {
    counter: 0,
    similarity: 0,
  }

  getCounter() {
    return this.state.counter;
  }

  handleCounterChange(i) {
    this.setState((state, props) => ({
      counter: i
    }));
  }

  handleSimChange(i) {
    this.setState((state, props) => ({
      similarity: i
    }));
  }

  render() {
    return (
      <div>
        <h1>Frames loaded: {this.state.counter}</h1>
        <h1>Similarity: {this.state.similarity}</h1>
        <VideoSelector
          getCounter={this.getCounter}
          handleCounter={this.handleCounterChange}
          handleSimilarity={this.handleSimChange}
          />
      </div>
    )
  }

}

class VideoSelector extends React.PureComponent {

  state = {
    src1: 'videos/curry_cropped.mp4',
    src2: 'videos/curry_cropped.mp4',
    loaded: false,
  };

  render() {
    return (
      <div>
        <fieldset disabled={!this.state.loaded}>
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
        </fieldset>
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
    console.log('LOADED ALL POSES!!!');
    return net;
  };

  doCompare = () => {
    const video = this.getVideo('video');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    let similarity = 0;

    let onplaying = async () => {
      let poses = [];
      const pose = await this.net.estimateSinglePose(video, {
        flipHorizontal: true,
        decodingMethod: 'single-person'
      });
      poses = poses.concat(pose);
      drawPoses(ctx, poses, video);

      const match = findMostSimilarMatch(this.vptree, pose);

      if (match.distance <= similarityMaxDistance) {
        similarity += 1;
      }

      if (!video.paused) {
        requestAnimationFrame(onplaying);
      }
    };

    function onstopped() {
      let result = Math.round(similarity / this.props.getCounter() * 100) / 100;
      this.props.handleSimilarity(result);
    }

    video.onplaying = onplaying;
    onstopped = onstopped.bind(this);
    video.addEventListener('ended', onstopped);
    video.playbackRate = 0.5;
    video.play();
  }

  async componentDidUpdate(prevProps, prevState) {
    const video1 = this.getVideo('video');
    video1.load();
    const video2 = this.getVideo('video2');
    video2.load();
  }

  getVideo(id) {
    const video = document.getElementById(id);
    return video;
  }

  async getVPTreeFor(video) {
    let i = 0;
    let allPoses = [];

    const canvas = document.getElementById('output2');
    const ctx = canvas.getContext('2d');

    let poseDetectionFrame = async () => {
      this.props.handleCounter(i);
      i += 1;

      const pose = await this.net.estimateSinglePose(video, {
        flipHorizontal: true,
        decodingMethod: 'single-person'
      });
      drawPoses(ctx, [pose], video);
      allPoses = allPoses.concat(pose);

      if (!video.paused) {
        requestAnimationFrame(poseDetectionFrame);
      }
    }

    video.onplaying = () => {
      poseDetectionFrame();
    }

    video.playbackRate = 0.5;
    video.play();

    return new Promise(resolve => {
      video.onended = async () => {
        const vectorMap = allPoses.map(pose => {
          return convertPoseToVector(pose);
        });
        const vptree = await buildVPTree(vectorMap);
        resolve(vptree);
      }
    });
  }

  async processComparingToVideo(video) {
    this.vptree = await this.getVPTreeFor(video);
  }

  async componentDidMount() {

    this.net = await this.setup();

    const video = this.getVideo('video2');

    await this.processComparingToVideo(video);

    this.setState({ loaded: true });

  }

}

export default Main;
