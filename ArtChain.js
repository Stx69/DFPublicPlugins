import { html, render, useState, useEffect, useRef } from
    "https://unpkg.com/htm/preact/standalone.module.js";

let viewport = ui.getViewport();
const PLANET_LEVELS = Object.values(PlanetLevel).map((level) => ({
    value: level,
    text: level.toString(),
}));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
import {
    ArtifactType,
    ArtifactTypeNames,
    ArtifactRarity,
    ArtifactRarityNames,
    PlanetLevel,
    PlanetType,
    PlanetTypeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";

const Styles = {

    Title: {
        fontSize: '22px',
        textAlign: 'center'
    },

    Item: {
        display: 'flex',
        alignItems: 'center'
    },

    ItemId: {
        marginLeft: '10px',
        textDecoration: 'underline',
        cursor: 'pointer'
    },

    ItemReset: {
        padding: '5px',
        cursor: "pointer",
        textDecoration: "underline",
        marginLeft: 'auto',
        fontSize: '20px'
    },

    ButtonGroup: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    Button: {
        width: '32%',
        fontSize: '14px',
        marginTop: '15px'
    }
}


const getFoundries = () => {
    return JSON.parse(localStorage.getItem('artChain')) || [];
}

const setFoundries = (foundries) => {
    localStorage.setItem(
        'artChain', JSON.stringify(foundries)
    )
}

function useInterval(callback, delay) {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

const centerPlaner = (id) => {
    ui.centerLocationId(id);
}

const prospectPlanet = async (id, callback) => {
    const planet = ui.getPlanetWithId(id);
    const onArtifactFinded = () => {
        foundriesList.shift();
        setFoundries(foundriesList);
        setPlanetsList(foundriesList);
    }
    if (planet.transactions.transactions.length > 0) {return null;}
    if (!planet.hasTriedFindingArtifact && planet.prospectedBlockNumber === undefined) {
        return await ui.prospectPlanet(planet.locationId);
    }
    //&& planet.prospectedBlockNumber + 256 < ui.getEthConnection().blockNumber
    else if (!planet.hasTriedFindingArtifact) {
        await ui.findArtifact(planet.locationId);
        setTimeout(callback, 4000);
    };

}

const searchSpeed = () => {

    const ship = df.getMyArtifacts().filter(p => (p.artifactType == 13));
    let from = df.getPlanetWithId(ship[0].onPlanetId);
    let toF = [];
    const fromId = from.locationId;
    const foundriesList = getFoundries();
    if (foundriesList.length >= 1) {
        toF = df.getPlanetWithId(foundriesList[0]);
    }

    const candidates_ = df.getPlanetsInRange(fromId, 1500)
        .filter((p) => p.bonus[3] && !isPlanetOutOfBounds(p))
        .filter((p) => df.getTimeForMove(from.locationId, p.locationId) + df.getTimeForMove(p.locationId, toF.locationId) < df.getTimeForMove(from.locationId, toF.locationId))
        .map(to => [to, distance(from, to)])
        //.sort((a, b) => b[1] - a[1])
        .sort((a, b) => b[1] < a[1] ? 0 : -1)
    const candidate = candidates_[0];

    if (candidate) {
        df.move(from.locationId, candidate[0].locationId, 0, 0, ship[0].id);
    }
    else { df.move(from.locationId, toF.locationId, 0, 0, ship[0].id); }
}

const distance = (from, to) => {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

const moveToPlanet = (setPlanetsList) => {
    const foundriesList = getFoundries();

    if (foundriesList.length === 0) return;

    let planet = ui.getPlanetWithId(foundriesList[0]);

    const ship = df.getMyArtifacts().filter(p => (p.artifactType == 13));
    let from = df.getPlanetWithId(ship[0].onPlanetId);

    const onArtifactFinded = () => {
        foundriesList.shift();
        setFoundries(foundriesList);
        setPlanetsList(foundriesList);
    }
    if (from.locationId === planet.locationId && planet.owner === df.getAccount()) {
        return prospectPlanet(planet.locationId, onArtifactFinded);
    }

    const onVoyage = df.getAllVoyages().some(voyage => voyage.eventId === ship[0].onVoyageId);
    const unconfirmed = df.getUnconfirmedMoves().filter(move => move.intent.from === from) + from.transactions.transactions.length;

    if (
        unconfirmed !== "0" ||
        planet?.locationId === from.locationId ||
        onVoyage
    ) { return; }

    if (!from.bonus[3]) {
        searchSpeed();
        return;
    } else {
        df.move(from.locationId, planet.locationId, 0, 0, ship[0].id);
        return;
    }

}

//

function Foundry({ locationId, id, onDelete }) {

    return html`
    <div style=${Styles.Item}>
      ${id + 1})
      <div style=${Styles.ItemId} onClick=${() => { centerPlaner(locationId) }}>
      ${locationId.slice(-4)}
      </div>
      <div style=${Styles.ItemReset} onClick=${() => onDelete(id)}>x</div>
    </div>
  `
}

function FoundriesList({ foundriesList, deleteFoundry }) {

    return html`
    <div>
      ${foundriesList.length ? (
            foundriesList.map((locationId, id) => {
                return html`
            <${Foundry}
              locationId=${locationId}
              id=${id}
              onDelete=${() => deleteFoundry(id)} />
            `;
            })
        ) : (
            html`<h2 style=${Styles.Title}>Choose planets</h2>`
        )
        }
    </div>
  `;
}

function LevelFilter({ levels, selectedLevels, onSelectLevel }) {
    const buttonStyle = {
        border: "1px solid #ffffff",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",

        width: "40px",
        height: "25px",
        padding: "0 0.3em",
        color: "white",
        textAlign: "center",
        transition: "background-color 0.2s, color 0.2s",
        borderRadius: "3px",
    };

    const buttonSelectedStyle = {
        ...buttonStyle,
        color: "white",
        background: "#00ADE1",
        borderRadius: 0,
    };

    const buttonsRow = {
        display: "flex",
        flexDirection: "row",
    };

    const button = ({ value, text, onClick, selected = false }) => html`
      <div
        style=${selected ? buttonSelectedStyle : buttonStyle}
        onClick=${() => onClick(value)}
      >
        ${text}
      </div>
    `;
    const inRange = (value) =>
        value <= Math.max(...selectedLevels) &&
        value >= Math.min(...selectedLevels);
    return html`
      <div style=${buttonsRow}>
        ${levels.map(({ value, text }) =>
        button({
            value,
            text,
            onClick: onSelectLevel,
            selected: inRange(value),
        })
    )}
      </div>
    `;
}

function getArrivalsToPlanet(plt) {
    let planetId = plt.locationId;
    var timestamp = new Date().getTime();
    timestamp = Math.floor(timestamp * 0.001);
    const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === planetId);
    const arrivals = df.getAllVoyages()
        .filter(arrival => arrival.toPlanet === planetId && arrival.arrivalTime > timestamp);
    return arrivals.length + unconfirmed.length;
}

function App({ plugin }) {
    const [selectedLevels, setSelectedLevels] = useState([1, 4]);
    const [moveGear, setMoveGear] = useState(false);
    const [addFoundry, setAddFoundry] = useState(false);
    const [search, setSearch] = useState(false);
    const [crawl, setCrawl] = useState(false);
    const [abandon, setAbandon] = useState(false);
    const [planetsList, setPlanetsList] = useState(
        getFoundries()
    );

    const ctx = document.getElementsByTagName('canvas')[1];

    const addPlanet = () => {
        const planet = ui.getSelectedPlanet();
        const foundriesList = getFoundries();

        if (
            addFoundry &&
            planet != undefined &&
            planet.planetType === 2 &&
            planet.prospectedBlockNumber === undefined &&
            !foundriesList?.some(locationId => locationId === planet.locationId)
        ) {

            foundriesList.push(planet.locationId);

            setFoundries(foundriesList);
            setPlanetsList(foundriesList);
        }
    }


    const toggleSearch = () => {

        if (!search) {

            let i = 0;
            while (i <= 3) {
                searchFoundry();
                i += 1;
            }
        }
        setSearch(!search);


    }

    const toggleCrawl = () => {
        if (!crawl) {
            CrawlFoundry();
        }
        setCrawl(!crawl);
    }

    const toggleAbandon = () => {
        if (!abandon) {
            Abandon();
        }
        setAbandon(!abandon);
    }

    const deleteFoundry = (id) => {
        const foundriesList = getFoundries();

        foundriesList.splice(id, 1);

        setFoundries(foundriesList);
        setPlanetsList(foundriesList);
    }

    const toggleMoveGear = () => {
        setMoveGear(!moveGear);
    }

    const toggleAddFoundry = () => {
        setAddFoundry(!addFoundry);
    }

    const searchFoundry = () => {

        const foundriesList = getFoundries();

        const ship = df.getMyArtifacts().filter(p => (p.artifactType == 13));
        let from = df.getPlanetWithId(ship[0].onPlanetId);

        if (foundriesList.length >= 1) {
            from = df.getPlanetWithId(foundriesList[foundriesList.length - 1]);
        }

        const fromId = from.locationId;
        const maxTime = 60 * 60;
        const candidates_ = df.getPlanetsInRange(fromId, 10000)
            .filter((p) => !p.hasTriedFindingArtifact &&
                p.planetType === 2 &&
                p.planetLevel >= Math.min(...selectedLevels) &&
                p.planetLevel <= Math.max(...selectedLevels) &&
                !isPlanetOutOfBounds(p) &&
                p.prospectedBlockNumber === undefined &&
                !foundriesList?.some(locationId => locationId === p.locationId))
            .filter((p) => df.getTimeForMove(from.locationId, p.locationId) < maxTime)
            .map(to => [to, distance(from, to) / to.planetLevel])
            //.sort((a, b) => b[1] - a[1])
            .sort((a, b) => b[1] < a[1] ? 0 : -1)
            .slice(0, 1);
        console.log(candidates_);

        for (let planet of candidates_) {
            foundriesList.push(planet[0].locationId);
            let foundriesListShort = foundriesList.slice(0, 15);
            setFoundries(foundriesListShort);
            setPlanetsList(foundriesListShort);
        }

    }


    const CrawlFoundry = async () => {
        //debugger;
        let maxDistributeEnergyPercent = 60;
        let fillingEnergyPercent = 10;
        let foundriesList = getFoundries();
        //debugger;
        for (const fromId of foundriesList) {
            let from = df.getPlanetWithId(fromId);
            if (from.owner !== df.account) {
                const candidates_ = df.getMyPlanets()
                    .filter(p => p.energy / p.energyCap >= 0.88 && !p.destroyed && !isPlanetOutOfBounds(p) &&
                        p.planetLevel <= Math.max(...selectedLevels) && p.planetLevel >= Math.min(...selectedLevels)) // filter level
                    // filter only planets with enough energy to capture + 500
                    .filter((p) => df.getEnergyNeededForMove(p.locationId, fromId, 200, false) < p.energy)
                    .map(to => [to, distance(from, to)])
                    .sort((a, b) => b[1] < a[1] ? 0 : -1)
                // .sort((a, b) => (b.energy / b.distance) * b.planetLevel < (a.energy / a.distance) * a.planetLevel ? 0 : -1);

                if (candidates_.length == 0) {
                    continue;
                }
                //debugger;
                let i = 0;
                const maxEnergy = Math.floor(from.energyCap - from.energy);

                let energyReceived = 0;
                let moves = 0;
                let energyLeft = 1;
                let captureEnergy = Math.ceil((from.energy * (from.defense / 100)) + (from.energyCap * (fillingEnergyPercent / 100)));

                let unconfirmed = df.getUnconfirmedMoves().filter(move => move.intent.to === from.locationId);
                // Search unconfirmed inbound energy for from 
                let energyUncomfired = 0;
                for (let moves in unconfirmed) {
                    energyUncomfired = energyUncomfired + Math.floor(unconfirmed[moves].intent.forces);
                }

                let arrivals = getArrivalsForPlanet(from.locationId);
                // Search confirmed inbound energy for from 
                let energyArrivals = 0;
                for (let moves in arrivals) {
                    energyArrivals = energyArrivals + Math.floor(arrivals[moves].energyArriving);
                }

                while (energyLeft - energyReceived > 0 && i < candidates_.length && unconfirmed.length + arrivals.length < 5 && captureEnergy - energyArrivals - energyUncomfired - 2 > 0) {
                    // Loop for energy distribute canditate to from reguest 
                    const candidate = candidates_[i++][0];
                    // from basic target capture energy additional for move
                    let captureEnergy = Math.ceil((from.energy * (from.defense / 100)) + (from.energyCap * (fillingEnergyPercent / 100)));

                    // Search Arrivals and uncofirmed moves for from
                    let arrivals = getArrivalsForPlanet(from.locationId);
                    // Search confirmed inbound energy for from 
                    let energyArrivals = 0;
                    for (let moves in arrivals) {
                        energyArrivals = energyArrivals + Math.floor(arrivals[moves].energyArriving);
                    }

                    // Search unconfirmed moves inbound from 
                    let unconfirmed = df.getUnconfirmedMoves().filter(move => move.intent.to === from.locationId);
                    // Search unconfirmed inbound energy for from 
                    let energyUncomfired = 0;
                    for (let moves in unconfirmed) {
                        energyUncomfired = energyUncomfired + Math.floor(unconfirmed[moves].intent.forces);
                    }

                    // Search unconfirmed moves outbound candidate not needed? energy is readed in unconfirmed
                    const unconfirmedC = df.getUnconfirmedMoves().filter(move => move.intent.from === candidate.locationId);
                    // Search for any uncofirmed forces from candidate
                    let energyUncomfiredC = 0;
                    for (let moves in unconfirmedC) {
                        energyUncomfiredC = energyUncomfiredC + Math.floor(unconfirmedC[moves].intent.forces);
                    }

                    //-------------------------------------------
                    // Check Arrivals and uncofirmed moves max 4
                    if (unconfirmed.length + arrivals.length > 4) {
                        continue;
                    }
                    // Check if Arrivals and account uncofirmed energy if will capture or not
                    if (captureEnergy - energyArrivals - energyUncomfired < 0) {
                        continue;
                    }
                    // Set max canditate energyBudget to use
                    let energyBudget = Math.floor(((maxDistributeEnergyPercent / 100) * candidate.energy));
                    // check if is still energy on canditate
                    const energyLeft = energyBudget - energyReceived - energyUncomfiredC;
                    // check if not overload for multi move from one candidate
                    if (energyLeft < 0) {
                        continue;
                    }

                    // Arrival energy count - static
                    let energyArriving = Math.ceil((from.energy * (from.defense / 100)) + (from.energyCap * (fillingEnergyPercent / 100)));
                    // arrival max  energy / 4
                    //let multiCrawlEnergyNeeded = Math.ceil(df.getEnergyNeededForMove(candidate.locationId, fromId, energyArriving * 0.26, false));

                    // energy need for mov raw and raw + 1 energy
                    let energyNeedRaw = Math.ceil(df.getEnergyNeededForMove(candidate.locationId, fromId, 1, false));
                    // Check raw energy need for move is enough
                    if (energyLeft - energyNeedRaw < 200) {
                        continue;
                    }
                    //debugger;
                    // energy need for mov raw and raw + Arriving energy
                    let energyNeed = Math.ceil(df.getEnergyNeededForMove(candidate.locationId, fromId, energyArriving, false));
                    // max possible energy for move
                    const energyNeedMax = Math.ceil(energyLeft - energyReceived - energyNeed >= 0 ? energyNeed : energyLeft - energyReceived);

                    //  energy need for move if achieved or not <> with energyNeedMax
                    if (energyLeft - energyNeed < 0) {
                        if (energyLeft - energyNeedMax >= 0) {
                            energyNeed = energyNeedMax;
                        }
                    }

                    // raw energy and energy Max need for move is not enough
                    if (energyLeft - energyNeed < 0 || energyLeft - energyNeedMax < 0) {
                        continue;
                    }
                    // energy need for move limit 500
                    if (energyNeed - energyNeedRaw < 200) {
                        continue;
                    }

                    try {
                        let tx = await df.move(candidate.locationId, fromId, energyNeed, 0, null, false)
                        while (!tx.confirmedPromise) {
                            await sleep(100)
                        }
                    }
                    catch (error) {
                        console.error('move may be revert...');
                    }
                    energyReceived += energyNeed;
                    moves += 1;

                }
                continue;
            }
            continue;
        }

    }

    const Abandon = async () => {
        let foundries = df.getMyPlanets()
            .filter(p => (p.planetType === 2 && !p.destroyed && !isPlanetOutOfBounds(p) && p.hasTriedFindingArtifact && p.planetLevel <= Math.max(...selectedLevels)))
            .sort((a, b) => b.planetLevel > a.planetLevel ? 0 : -1);

        for (const from of foundries) {
            let candidateAimPlanets = df.getPlanetsInRange(from.locationId, 100)
                .filter(planet => (
                    planet.owner === df.account &&
                    foundries.includes(planet) === false &&
                    planet.location !== undefined &&
                    planet.destroyed === false &&
                    planet.PlanetType !== 5 &&
                    getArrivalsToPlanet(planet) < 5 &&
                    planet.planetLevel >= Math.min(...selectedLevels) &&
                    planet.planetLevel <= Math.max(...selectedLevels)
                ))
                //.filter(planet => (isSpaceRip(planet) && planet.owner !== df.account ))
                .sort((a, b) => {
                    let aDist = df.getDist(a.locationId, from.locationId) / priorityinlevelCalculateAbandon(a);
                    let bDist = df.getDist(b.locationId, from.locationId) / priorityinlevelCalculateAbandon(b);
                    return aDist - bDist;
                });
            //debugger;
            if (candidateAimPlanets.length === 0) {
                continue;
            }
            let to = candidateAimPlanets[0];
            let fromId = from.locationId;
            let toId = to.locationId;
            let arrivingEnergy = 2;
            let abandoning = true;

            let energyNeed = df.getEnergyNeededForMove(fromId, toId, arrivingEnergy, abandoning);
            energyNeed = Math.ceil(energyNeed);
            let energyHave = Math.floor(from.energy);
            if (energyNeed > energyHave) {
                continue;
            }

            let forces = Math.ceil(df.getEnergyNeededForMove(fromId, toId, arrivingEnergy, false));
            let silver = 0;
            let artifactMoved = undefined;
            //debugger;
            if (from.heldArtifactIds.length > 0) {
                let ArtIDs = df.getArtifactsWithIds(from.heldArtifactIds)
                    .filter(p => (p.artifactType < 10))
                //debugger;
                if (ArtIDs.length > 0) {
                    artifactMoved = ArtIDs[0].id;
                }
                else { artifactMoved = undefined; };
                if (ArtIDs.length >= 2) {
                    abandoning = false;
                };
            }
            else {
                artifactMoved = undefined;
            };
            //abandoning need to be check
            try {
                let tx = await df.move(fromId, toId, forces, silver, artifactMoved, abandoning);
                while (!tx.confirmedPromise) {
                    await sleep()
                }
            }
            catch (error) {
                console.error('move may be revert...');
            }
        }

    }

    const exportArtChain = () => {
        let artChainExp = JSON.stringify(getFoundries());
        var blob = new Blob([artChainExp], { type: 'application/json' }),
            anchor = document.createElement('a');
        anchor.download = new Date().toLocaleString() + "_" + df.getAccount() + '_artChain.json';
        anchor.href = (window.webkitURL || window.URL).createObjectURL(blob);
        anchor.dataset.downloadurl = ['application/json', anchor.download, anchor.href].join(':');
        anchor.click();

    };

    const importArtChain = () => {
        let inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.onchange = () => {
            try {
                var file = inputFile.files.item(0);
                var reader = new FileReader();

                reader.onload = () => {
                    setFoundries(JSON.parse(reader.result));
                    setPlanetsList(JSON.parse(reader.result));
                };
                reader.readAsText(file);
            } catch (err) {
                console.error(err);
                return;
            }
        }
        inputFile.click();
    }

    const planetLevelFilter = html`<div style=${{ marginBottom: "3px" }}>
          Foundry and Planets Level Ranges 
        </div>
        <${LevelFilter}
          levels=${PLANET_LEVELS}
          selectedLevels=${selectedLevels}
          onSelectLevel=${(level) => {
            if (selectedLevels.length == 2) {
                setSelectedLevels([level]);
            } else {
                setSelectedLevels([level, selectedLevels[0]]);
            }
        }}
        />`;

    useEffect(() => {
        if (moveGear) moveToPlanet(setPlanetsList);
    }, []);

    useEffect(() => {
        plugin.artChain = planetsList;
    }, [planetsList]);

    useEffect(() => {
        ctx.addEventListener('click', addPlanet);

        return () => {
            ctx.removeEventListener('click', addPlanet);
        }
    }, [addFoundry]);



    useInterval(() => {
        if (moveGear) {
            moveToPlanet(setPlanetsList);
            if (search) {
                const foundriesList = getFoundries();

                if (foundriesList.length < 5) {
                    let i = 0;
                    while (i <= 2) {
                        searchFoundry();
                        i += 1;
                    }
                }

            }

            if (crawl) {
                CrawlFoundry();
            }
            if (abandon) {
                Abandon();
            }
        }
    }, [4000]);

    return html`
    ${planetLevelFilter}

    <${FoundriesList} foundriesList=${planetsList} deleteFoundry=${deleteFoundry} />
		<div style=${Styles.ButtonGroup}>
      <button onClick=${toggleMoveGear} style=${Styles.Button}>
        ${moveGear ? 'Stop' : 'Start'}
      </button>
      <button onClick=${toggleAddFoundry} style=${Styles.Button}>
        ${addFoundry ? 'Off' : 'Add'}
      </button>
      <button onClick=${toggleSearch} style=${Styles.Button}>
        ${search ? 'Stop' : 'Srch'}
      </button>
      <button onClick=${toggleCrawl} style=${Styles.Button}>
        ${crawl ? 'Stop' : 'Crawl'}
      </button>
      <button onClick=${toggleAbandon} style=${Styles.Button}>
        ${abandon ? 'Stop' : 'Aband'}
      </button>
    </div>

    <div style=${Styles.ButtonGroup}>
      <button onClick=${importArtChain} style=${Styles.Button}>
       Import
      </button>
      <button onClick=${exportArtChain} style=${Styles.Button}>
       Export
      </button>
    </div>

  `;
}
class ArtChain {
    constructor() {
        this.artChain = [];
    }

    async render(container) {

        this.container = container;
        container.style.width = "300px";

        render(html`<${App} plugin=${this} />`, container);
    }

    destroy() {
        render(null, this.container);
    }

    draw(ctx) {

        if (this.artChain.length > 1) this.drawLines(ctx);
    }

    drawLines(ctx) {

        ctx.save();

        ctx.strokeStyle = '#10d9e2';

        ctx.beginPath();

        this.artChain.map((foundryId, index) => {
            const coords = ui.getPlanetWithId(foundryId).location.coords;
            const { x, y } = viewport.worldToCanvasCoords(coords);
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });

        ctx.stroke();
    }
}

function getArrivalsForPlanet(planetId) {
    return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

function isSpaceRip(planet) {
    return planet.planetType === PlanetType.TRADING_POST;
}

function planetPower(planet) {
    return (planet.energy * planet.defense) / 100;
}

function isPlanetOutOfBounds(planet) {
    // do planet = df.getPlanetWithId is `planet` is a locationId
    const { x, y } = planet.location.coords;
    const distance = Math.sqrt(x ** 2 + y ** 2);
    if (distance < df.getWorldRadius()) {
        return false;
    }
    return true;
}

function priorityinlevelCalculateAbandon(planetObject) {
    let priority = 0;
    switch (planetObject.planetType) {
        //plant
        case 0:
            priority = ((planetObject.planetLevel * 1.4) + (planetObject.bonus[1] * 1.2) + (planetObject.bonus[2] * 1.5) + planetObject.bonus[3] + planetObject.bonus[4] + (planetObject.bonus[5] * 2));
            break;
        //silvermine
        case 1:
            priority = ((planetObject.planetLevel * 1.2) + (planetObject.bonus[1] * 1.2) + (planetObject.bonus[2] * 1.5) + planetObject.bonus[3] + planetObject.bonus[4] + (planetObject.bonus[5] * 2));
            break;
        //fountry
        case 2:
            priority = ((planetObject.planetLevel * 1.3) + (planetObject.bonus[1] * 1.2) + (planetObject.bonus[2] * 1.5) + planetObject.bonus[3] + planetObject.bonus[4] + (planetObject.bonus[5] * 2));
            break;
        //silverrip
        case 3:
            priority = ((planetObject.planetLevel * 2.5) + (planetObject.bonus[1] * 1.2) + (planetObject.bonus[2] * 1.5) + planetObject.bonus[3] + planetObject.bonus[4] + (planetObject.bonus[5] * 2));
            break;
        //Quasar
        case 4:
            priority = ((planetObject.planetLevel * 1.0) + (planetObject.bonus[2] * 1)) / (planetObject.spaceJunk);
            break;
        default:
            break;
    }
    //priority = Math.sqrt((planetObject.coords.x - 0) ** 2 + (planetObject.coords.y - 0) ** 2);
    return priority;
}

/**
 * And don't forget to export it!
 */
export default ArtChain;
