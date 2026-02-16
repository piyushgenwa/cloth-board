import { Board } from "./components/Board/Board";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { AddItemModal } from "./components/Modals/AddItemModal";

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <Toolbar />
      <div className="flex-1 pt-14">
        <Board />
      </div>
      <AddItemModal />
    </div>
  );
}

export default App;
